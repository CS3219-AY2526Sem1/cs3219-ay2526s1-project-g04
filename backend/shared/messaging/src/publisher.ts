import amqp from "amqplib"
import type { Channel, ChannelModel } from "amqplib";
import { MESSAGE_TYPES } from "./constants.js";

// load env vars
import dotenv from "dotenv";

dotenv.config();

export class MessagePublisher {
    
    public publisherName: string | null = null;
    private url: string = "";
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;

    private EXCHANGE = "PeerPrep";

    public constructor(publisherName: string) {
        const url = process.env["RABBITMQ_URL"];
        if (!url) {
            throw new Error("RABBITMQ_URL is not defined in .env file");
        }

        this.publisherName = publisherName;
        this.url = url;

    }

    public async connect() {
        if (!this.connection) {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
        } 
    }

    public publishMessageWithType(messageType: MESSAGE_TYPES, message: any) {
        if (!this.channel) {
            throw new Error('Connection is not established')
        }
        this.channel.assertExchange(this.EXCHANGE, 'direct', {
            durable: true
        })
        this.channel.publish(this.EXCHANGE, messageType, Buffer.from(message))

        //TODO: Convert this into logging
        console.log(this.publisherName, "sent", message)
    }
}