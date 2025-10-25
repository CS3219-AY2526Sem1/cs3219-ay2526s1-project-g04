import { MESSAGE_TYPES } from "../src/constants.js"
import { MessagePublisher } from "../src/publisher.js"

const messager = new MessagePublisher("publisher_name") // pass in a name to keep track who publishes

await messager.connect()

// sends `random message` with type CollaborationService
messager.publishMessageWithType(MESSAGE_TYPES.CollaborationService, "random message")