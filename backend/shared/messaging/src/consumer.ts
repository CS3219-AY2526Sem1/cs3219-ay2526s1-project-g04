import amqp from "amqplib"
import type { Channel, ChannelModel, ConsumeMessage } from "amqplib";
import { MESSAGE_TYPES } from "./constants.js";

// load env vars
import dotenv from "dotenv";

dotenv.config();

export class MessageReceiver {
    
    public receiverName: string | null = null;
    private url: string = "";
    private connection: ChannelModel | null = null;
    private channel: Channel | null = null;

    private EXCHANGE = "PeerPrep";

    public constructor(receiverName: string) {
        const url = process.env["RABBITMQ_URL"];
        if (!url) {
            throw new Error("RABBITMQ_URL is not defined in .env file");
        }

        this.receiverName = receiverName;
        this.url = url;
        
    }

    public async connect(): Promise<void> {
        if (!this.connection) {
            this.connection = await amqp.connect(this.url);
            this.channel = await this.connection.createChannel();
        } 
    }

    public async listenForMessagesWithType(message_types: MESSAGE_TYPES[], message_handler: (routingKey: MESSAGE_TYPES, content: string) => any): Promise<void> {
        if (!this.channel) {
            throw new Error('Connection is not established')
        }
        this.channel.assertExchange(this.EXCHANGE, 'direct', {
            durable: true
        })
        const aQ = await this.channel.assertQueue('', {
            exclusive: true
        })

        console.log(this.receiverName, 'is waiting for messages. To exit press CTRL+C');

        message_types.forEach((message_type: MESSAGE_TYPES) => {
            this.channel!.bindQueue(aQ.queue, this.EXCHANGE, message_type)
        })
        
        this.channel.consume(
            aQ.queue, 
            (msg: ConsumeMessage | null)=>{
                console.log(this.receiverName, "received:", msg?.fields.routingKey, msg?.content.toString());
                const messageTypeStr: string = msg!.fields.routingKey
                const messageType: MESSAGE_TYPES = Object.values(MESSAGE_TYPES).includes(messageTypeStr as MESSAGE_TYPES) 
                    ? (messageTypeStr as MESSAGE_TYPES) 
                    : MESSAGE_TYPES.Invalid;
                message_handler(messageType, msg!.content.toString())
            }, 
            {noAck: false}
        )
    }
}