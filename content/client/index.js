import { DOMRenderer } from "./dom/dom-renderer";

import { EventPreventers } from "./handlers/local/event-preventers";
import { InputEmitters } from "./handlers/local/input-emitters";
import { StateEmitters } from "./handlers/local/state-emitters";

import { DialogBuilders } from "./handlers/remote/dialog-builders";
import { DOMBuilders } from "./handlers/remote/dom-builders";
import { RtcReceivers } from "./handlers/remote/rtc-receivers";
import { StateReceivers } from "./handlers/remote/state-receivers";

const renderer = new DOMRenderer();

new EventPreventers().start();
new StateEmitters(renderer).start();
new InputEmitters(renderer).start();

new DialogBuilders().start();
new DOMBuilders(renderer).start();
new RtcReceivers(renderer).start();
new StateReceivers().start();
