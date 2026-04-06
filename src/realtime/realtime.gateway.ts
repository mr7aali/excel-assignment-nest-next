import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway {
  @WebSocketServer()
  server: Server;

  emitTransactionCreated(payload: any) {
    this.server.emit('transaction:created', payload);
  }

  emitBalanceUpdated(payload: any) {
    this.server.emit('balance:updated', payload);
  }

  emitTransactionFailed(payload: any) {
    this.server.emit('transaction:failed', payload);
  }
}
