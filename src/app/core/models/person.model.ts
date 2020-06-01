export class Person{
  constructor(
    public id: string,
    public name: string,
    public birthday?: string,
    public birthyear?: number,
    public culture?: string,
    public deathday?: string,
    public height?: number,
    public image?: string,
    public profession?: string,
    public race?: string,
    public title?: string,
    public pc?: boolean,
  ){}
}
