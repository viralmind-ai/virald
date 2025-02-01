# Virald Node

Virald is a node implementation for a distributed VM cloud network. This node registers itself with the API server and can handle VM execution tasks.

## Folder Structure
```
virald/
├── node/
│   ├── index.ts  # Virald node server handling VM execution
│   ├── client.ts  # Communicates with the main API server
├── package.json
├── tsconfig.json
└── README.md
```

## Installation
Ensure you have Node.js installed, then run:
```sh
npm install
```

## Running the Node
Start the node with:
```sh
npm start
```

## API Documentation
The node communicates with a central API server. The following endpoints are relevant:

### Register Node
**POST /register**
- Request Body: `{ "address": "<node_address>" }`
- Response: `{ "id": "<node_id>", "message": "Node registered successfully" }`

### Get Nodes
**GET /nodes**
- Response: `{ "nodes": { "<node_id>": { "id": "<node_id>", "address": "<node_address>", "earnings": <amount> } } }`

### Assign VM to Node
**POST /assign-vm**
- Request Body: `{ "nodeId": "<node_id>", "amount": <number> }`
- Response: `{ "message": "VM assigned", "node": { "id": "<node_id>", "address": "<node_address>", "earnings": <amount> } }`

## License
MIT
