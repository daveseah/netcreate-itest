/* eslint-disable no-unused-vars */
/*///////////////////////////////// ABOUT \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\*\

  WIP URNET refactor

  The URNET protocol has not been refactored since 2014, and could be cleaned
  up a lot so we can create other transports in different languages.

\*\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ * /////////////////////////////////////*/

type NP_Channel = 'LOCAL:' | 'NET:' | 'SRV:' | '';
type NP_Message = `${NP_Channel}${string}`;
type NP_Type = 'msend' | 'msig' | 'mreq' | 'mres';
type NP_AuthToken = any;
type NP_Data = { [key: string]: any };
type NP_Opt = { [key: string]: any };
type NP_ID = `pkt${number}`;
type NP_ADDR = `UADDR-${number}`;
type NP_Hash = `${NP_ADDR}:${NP_ID}`; // used for transaction lookups

/** Assuming our socket interface has these properties. NetPackets are
 *  capable of sending themselves over a provided INetSocket
 */
interface INetSocket {
  UADDR: string; // local urnet address
  send(json: string, err: function): void;
}

/** INetPacket is the data transport object that's serialized and sent through
 *  URNET using a message-based addressing mode.
 */
interface INetPacket {
  msg: NP_Message; // message name of form CHANNEL:MESSAGE
  data: NP_Data; // message data payload
  auth: NP_AuthToken; // authentication token
  //
  id: string; // packet id
  s_uid: string; // source urnet endpoint id
  s_uaddr: string; // source urnet address
  type: NP_Type; // type of message invocation send, signal, call
  mdir: NP_MsgDir; // call direction (used by transactions)
  //
  seqnum: number; // sequence number for every hop
  seqlog: any[]; // sequence log for debugging per hop

  new (arg: object | string, data?: any, type?: NP_Type): INetPacket;
  setMessage(msg: NP_Message): void; // set message string
  getMessage(): NP_Message; // return packet message string
  setData(arg: object | string, val?: any): void;
  getData(arg?: string): any;
  socketSend(socket: INetSocket): void;

  transactionStart(socket: INetSocket): Promise<NP_Data>;
  transactionReturn(socket: INetSoket): void;
  transactionComplete(): void;
}

type HandlerFunc = (data: NP_Data) => void;
type HandlerMap = Map<NP_Message, HandlerFunc>;

/** IEndPoint is the interface talking to URNET. Both class-messager and class-endpointg
 *  implement a similar interface; this might be combined
 */
interface IEndPoint {
  handleMessage(msg: NP_Message, handler: HandlerFunc): void;
  unhandleMessage(msg: NP_Message, handler: HandlerFunc): void;
  //
  callMessage(msg: NP_Message, inData: NP_Data, options: NP_Opt): Promise<NP_Data>;
  sendMessage(msg: NP_Message, inData: NP_Data, options: NP_Opt): void;
  raiseMessage(msg: NP_Message, inData: NP_Data, options: NP_Opt): void;
}

/*/ 
NOTES:

the main message dispatcher does the following
- deserialize data into a NetPacket `pkt`
- if pkt.type is 'mres' then pkt.transactionComplete() to forward to originator
- if pkt.type is 'msend' then endpoint.sendMessage() transactionReturn()
- if pkt.type is 'msig' then endpoint.raiseMessage() transactionReturn()
- if pkt.type is 'mreq' then endpoint.callMessage() transactionReturn()

the message client is called an "endpoint" which invoked "messager"
- the messager has screwy logic to determine whether call is invoked locally or
  from the network
- if it's local, then it calls the handler directly 
- if it's network, then it creates a NetPacket and sends

CLEVERNESS - promises and closures to remember (a) the packet being called
and (b) forwarding non-server calls as an intermediaary in another promise

THIS SHOULD BE REDIAGRAMMED

the netpacket class keeps track of all transaction. 
(A) transactions begin with 'mreq' -> transactionStart()
- creates Promise that creates a hashkey from packet, then uses hashkey to store Promise 
  resolve() as anonymous function
- Promise calls socketSend(socket)
- Waits for all promises to resolve...which is triggered elsewhere!

(B) when the message dispatcher receive an 'mreq', it knows it's a transaction call.
- it calls the EndPoint.callMessage() with the 'from net' flag, which itself will
  do another network call if necessary, and awaits the promise to return.
- when the promise returns with the data result, it changes the data and initiates
  transactionReturn with mode 'mres' now

(C) when the 'mres' is received, transactionComplete() is called on the packet
back on the originator, and it sees if there's a resolver function, which then runs

the message-stream class keeps track of all registered message handlers
for the endpoint, keeping local and net handlers separate

/*/
