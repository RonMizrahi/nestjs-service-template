/** Domain event published on the bus after a user is created. */
export class UserCreatedEvent {
  constructor(
    readonly userId: string,
    readonly email: string,
  ) {}
}
