import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

interface Client {
  id: string;
  ws: WebSocket;
  mode: "text" | "video";
  interests: string[];
  joinedAt: number;
  peerId: string | null;
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const PORT = 3000;

// Parsers for JSON reports
app.use(express.json());

// Set of string combinations: "idA_idB" block relation
const blocklist = new Set<string>();

// Active clients: id -> Client
const clients = new Map<string, Client>();
// Matchmaking queue: client IDs
const queue = new Set<string>();

// Generate a simple unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Intersect two interest tag arrays
function getOverlap(tags1: string[], tags2: string[]): string[] {
  const t2 = new Set(tags2.map(t => t.toLowerCase().trim()));
  return tags1.filter(t => t2.has(t.toLowerCase().trim()));
}

// Clean up peer details
function cleanPair(client: Client) {
  if (client.peerId) {
    const peer = clients.get(client.peerId);
    if (peer) {
      peer.peerId = null;
      try {
        peer.ws.send(JSON.stringify({ type: "disconnected", reason: "peer_left" }));
      } catch (err) {
        // Safe ignore
      }
    }
    client.peerId = null;
  }
}

// Send online count to all clients
function broadcastOnlineCount() {
  const payload = JSON.stringify({ type: "stats", count: clients.size });
  for (const client of clients.values()) {
    try {
      client.ws.send(payload);
    } catch {
      // Safe ignore
    }
  }
}

// Main Matchmaking Loop running periodically
setInterval(() => {
  if (queue.size < 2) return;

  const arr = Array.from(queue).map(id => clients.get(id)).filter(Boolean) as Client[];
  
  // Sort by entry time so oldest gets matched first
  arr.sort((a, b) => a.joinedAt - b.joinedAt);

  const matched = new Set<string>();

  for (let i = 0; i < arr.length; i++) {
    const userA = arr[i];
    if (matched.has(userA.id)) continue;

    let partner: Client | null = null;
    let maxOverlapCount = -1;
    let bestPartnerIndex = -1;

    // Look for a match
    for (let j = i + 1; j < arr.length; j++) {
      const userB = arr[j];
      if (matched.has(userB.id) || userA.mode !== userB.mode) continue;

      // Skip blocklisted combinations
      if (blocklist.has(`${userA.id}_${userB.id}`) || blocklist.has(`${userB.id}_${userA.id}`)) {
        continue;
      }

      // Calculate interest similarity
      const overlap = getOverlap(userA.interests, userB.interests);
      
      // If there are specific interests and we have overlapping tags, select the best fit
      if (userA.interests.length > 0 && userB.interests.length > 0 && overlap.length > 0) {
        if (overlap.length > maxOverlapCount) {
          maxOverlapCount = overlap.length;
          partner = userB;
          bestPartnerIndex = j;
        }
      }
    }

    // Fallback: If no tag match found, but userA has been waiting for more than 4 seconds,
    // match them with the oldest available person of the same mode.
    if (!partner && (Date.now() - userA.joinedAt > 4000 || userA.interests.length === 0)) {
      for (let j = i + 1; j < arr.length; j++) {
        const userB = arr[j];
        if (!matched.has(userB.id) && userA.mode === userB.mode) {
          // Verify they aren't blocklisted
          if (blocklist.has(`${userA.id}_${userB.id}`) || blocklist.has(`${userB.id}_${userA.id}`)) {
            continue;
          }
          partner = userB;
          bestPartnerIndex = j;
          break;
        }
      }
    }

    if (partner) {
      // Pair them up!
      matched.add(userA.id);
      matched.add(partner.id);

      queue.delete(userA.id);
      queue.delete(partner.id);

      userA.peerId = partner.id;
      partner.peerId = userA.id;

      const overlap = getOverlap(userA.interests, partner.interests);

      userA.ws.send(
        JSON.stringify({
          type: "paired",
          peerId: partner.id,
          initiator: true,
          interests: overlap,
          mode: userA.mode,
        })
      );

      partner.ws.send(
        JSON.stringify({
          type: "paired",
          peerId: userA.id,
          initiator: false,
          interests: overlap,
          mode: partner.mode,
        })
      );
    }
  }
}, 1000);

// API route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", clients: clients.size, inQueue: queue.size, reports: blocklist.size / 2 });
});

app.post("/api/report", (req, res) => {
  const { reporterId, reportedPeerId, reason, details } = req.body;
  if (!reason) {
    return res.status(400).json({ error: "Reason is required" });
  }

  // Register reported block relationship
  if (reporterId && reportedPeerId) {
    blocklist.add(`${reporterId}_${reportedPeerId}`);
    blocklist.add(`${reportedPeerId}_${reporterId}`);
  }

  console.log(`[Report Received] Reporter: ${reporterId} Reported: ${reportedPeerId} Reason: ${reason} Details: ${details || "none"}`);
  res.json({ success: true });
});

// Handle upgrade from HTTP to WebSocket
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;

  if (pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// WebSockets implementation
wss.on("connection", (ws) => {
  const clientId = generateId();
  const client: Client = {
    id: clientId,
    ws,
    mode: "text",
    interests: [],
    joinedAt: Date.now(),
    peerId: null,
  };

  clients.set(clientId, client);
  
  // Immediately notify client of their ID and current total online count
  ws.send(JSON.stringify({ type: "welcome", id: clientId }));
  broadcastOnlineCount();

  ws.on("message", (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());
      
      switch (data.type) {
        case "join": {
          // Clean up any existing pairs
          cleanPair(client);
          
          client.mode = data.mode || "text";
          client.interests = Array.isArray(data.interests) ? data.interests : [];
          client.joinedAt = Date.now();
          client.peerId = null;

          queue.add(client.id);
          
          ws.send(JSON.stringify({ type: "searching" }));
          break;
        }

        case "leave": {
          cleanPair(client);
          queue.delete(client.id);
          ws.send(JSON.stringify({ type: "idle" }));
          break;
        }

        case "message": {
          if (client.peerId) {
            const peer = clients.get(client.peerId);
            if (peer) {
              peer.ws.send(JSON.stringify({
                type: "message",
                text: data.text,
                sender: "stranger"
              }));
            }
          }
          break;
        }

        case "typing": {
          if (client.peerId) {
            const peer = clients.get(client.peerId);
            if (peer) {
              peer.ws.send(JSON.stringify({
                type: "typing",
                isTyping: !!data.isTyping
              }));
            }
          }
          break;
        }

        // WebRTC Signaling relays
        case "offer":
        case "answer":
        case "ice-candidate": {
          if (client.peerId) {
            const peer = clients.get(client.peerId);
            if (peer) {
              peer.ws.send(JSON.stringify(data));
            }
          }
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  });

  ws.on("close", () => {
    cleanPair(client);
    queue.delete(clientId);
    clients.delete(clientId);
    broadcastOnlineCount();
  });

  ws.on("error", () => {
    cleanPair(client);
    queue.delete(clientId);
    clients.delete(clientId);
    broadcastOnlineCount();
  });
});

// Configure Vite integration for Full Stack
async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
