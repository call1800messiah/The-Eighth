export class Achievement {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public unlocked: Date,
    public icon: string,
    public people: any[]
  ) {}
}
