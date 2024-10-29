/**
 * A visualization of the neural network, showing all connections and nodes.
 */
export class NetworkVisualizer {
    constructor(config = {}) {
        this.canvas = config.canvas || "NetworkVisualizer";
        this.backgroundColor = config.backgroundColor || "#FFFFFF";
        this.nodeRadius = config.nodeRadius !== undefined ? config.nodeRadius : -1;
        this.nodeColor = config.nodeColor || "grey";
        this.positiveConnectionColor = config.positiveConnectionColor || "green";
        this.negativeConnectionColor = config.negativeConnectionColor || "red";
        this.connectionStrokeModifier = config.connectionStrokeModifier || 1;
    }

    drawNetwork(network) {
        const canv = document.getElementById(this.canvas);
        const ctx = canv.getContext("2d");
        let radius;

        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, canv.width, canv.height);

        if (this.nodeRadius !== -1) {
            radius = this.nodeRadius;
        } else {
            radius = Math.min(canv.width, canv.height) / (Math.max(network.inputs.length, network.hidden.length, network.outputs.length, 3)) / 2.5;
        }

        const nodeLocations = {};
        const inputX = canv.width / 5;
        network.inputs.forEach((inputID, inputIndex) => {
            nodeLocations[inputID] = {
                x: inputX,
                y: (canv.height / network.inputs.length) * (inputIndex + 0.5),
            };
        });

        const hiddenX = canv.width / 2;
        network.hidden.forEach((hiddenID, hiddenIndex) => {
            nodeLocations[hiddenID] = {
                x: hiddenX,
                y: (canv.height / network.hidden.length) * (hiddenIndex + 0.5),
            };
        });

        const outputX = (canv.width / 5) * 4;
        network.outputs.forEach((outputID, outputIndex) => {
            nodeLocations[outputID] = {
                x: outputX,
                y: (canv.height / network.outputs.length) * (outputIndex + 0.5),
            };
        });

        nodeLocations.BIAS = { x: canv.width / 3, y: radius / 2 };

        Object.values(network.connections).forEach((connection) => {
            ctx.beginPath();
            ctx.moveTo(nodeLocations[connection.in].x, nodeLocations[connection.in].y);
            ctx.lineTo(nodeLocations[connection.out].x, nodeLocations[connection.out].y);
            ctx.strokeStyle = connection.weight > 0 ? this.positiveConnectionColor : this.negativeConnectionColor;
            ctx.lineWidth = Math.abs(connection.weight) * this.connectionStrokeModifier;
            ctx.lineCap = "round";
            ctx.stroke();
        });

        Object.entries(nodeLocations).forEach(([nodeKey, location]) => {
            const node = network.getNodeByID(nodeKey);
            ctx.beginPath();
            const nodeRadius = nodeKey === "BIAS" ? radius / 2.2 : radius;
            ctx.arc(location.x, location.y, nodeRadius, 0, 2 * Math.PI);
            ctx.fillStyle = this.backgroundColor;
            ctx.fill();
            ctx.strokeStyle = this.nodeColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.globalAlpha = node.value;
            ctx.fillStyle = this.nodeColor;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }
}