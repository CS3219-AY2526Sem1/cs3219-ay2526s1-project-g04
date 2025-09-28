import { MESSAGE_TYPES } from "../src/constants.js"
import { MessageReceiver } from "../src/consumer.js"

const messager = new MessageReceiver("receiver_name") // pass in a name to keep track who listens

await messager.connect()

// Message handler, handle the respective messages
const message_handler = (msgType: MESSAGE_TYPES, msg: string)=>{
  if (msgType === MESSAGE_TYPES.CollaborationService)
    console.log(msg)
}

// Only listens to message with CollaborationService type
messager.listenForMessagesWithType([MESSAGE_TYPES.CollaborationService], message_handler)