export type PublicContactPayload={
 id:string;
 reason:string;
 data:Record<string,string>;
 followUp:boolean;
 consent:boolean;
 startedAt:number;
};

export function publicContactPayload(payload:PublicContactPayload){
 return payload;
}
