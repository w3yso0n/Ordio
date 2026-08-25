import { Logger } from '@nestjs/common';
import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/auth.types';

@WebSocketGateway({ cors: { origin: true }, namespace: '/events' })
export class EventsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = String(client.handshake.auth?.token ?? client.handshake.query.token ?? '');
      const payload = this.jwt.verify<JwtPayload>(token);
      if (payload.organizationId) {
        await client.join(`org:${payload.organizationId}`);
      }
      if (payload.branchId) {
        await client.join(`branch:${payload.branchId}`);
      }
    } catch (err) {
      this.logger.warn(`WS rejected: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  emitCatalogUpdated(branchId: string) {
    this.server?.to(`branch:${branchId}`).emit('catalog.updated', { branchId });
  }

  emitCashChanged(branchId: string) {
    this.server?.to(`branch:${branchId}`).emit('cash.session.changed', { branchId });
  }

  emitKitchenTicket(organizationId: string, branchId: string, ticket: unknown) {
    this.server?.to(`org:${organizationId}`).emit('kitchen.ticket', { branchId, ticket });
    this.server?.to(`branch:${branchId}`).emit('kitchen.ticket', { branchId, ticket });
  }
}
