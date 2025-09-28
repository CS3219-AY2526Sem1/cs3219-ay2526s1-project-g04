import amqp from "amqplib"
import type { Channel, ChannelModel } from "amqplib";
import { MESSAGE_TYPES } from "./constants.js";

export class MessagePublisher {
    
    public publisherName: string | null = null
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null

    private EXCHANGE = "PeerPrep"

    public constructor(publisherName: string) {
        this.publisherName = publisherName
    }

    public async connect() {
        if (!this.connection) {
            this.connection = await amqp.connect("amqp://admin:rabbitmq123@localhost:5672")
            this.channel = await this.connection.createChannel()
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