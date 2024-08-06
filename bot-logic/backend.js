import express from 'express';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import { HfInference } from '@huggingface/inference';

// Get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

const PORT = process.env.PORT || 3000;
const inference = new HfInference("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");

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve main.html at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve other.html at /other path
/*
app.get('/other', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'other.html'));
}); */

io.on('connection', (socket) => {
  console.log('A client connected');

  socket.on('query', async (message) => {
    console.log('Received message:', message);
    try {
      let fullResponse = '';
      let isComplete = false;

      for await (const chunk of inference.chatCompletionStream({
        model: "microsoft/Phi-3-mini-4k-instruct",
        messages: [{ role: "user", content: message }],
        max_tokens: 1500,
      })) {
        const content = chunk.choices[0]?.delta?.content || "";
        socket.emit('inferenceChunk', content);
        fullResponse += content;
        console.log(content);
      }

      // Emit end of data signal
      isComplete = true;
      socket.emit('inferenceComplete', { fullResponse, isComplete });

    } catch (error) {
      console.error('Error during inference:', error);
      socket.emit('error', 'Error during inference: ' + error.message);
    }
  }); 

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

