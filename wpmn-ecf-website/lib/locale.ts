// Locale expresses formatting preference, not geographic location or nationality.
export const ministryTimeZone='Asia/Manila';
export function validLocale(value:string){try{return value.length<=80&&Intl.getCanonicalLocales(value).length===1;}catch{return false;}}
export function validTimeZone(value:string){try{if(!value||value.length>100)return false;new Intl.DateTimeFormat('en',{timeZone:value}).format();return true;}catch{return false;}}
export function browserPreferences(){
 const locale=typeof navigator!=='undefined'&&validLocale(navigator.language)?Intl.getCanonicalLocales(navigator.language)[0]:'en';
 const detected=Intl.DateTimeFormat().resolvedOptions().timeZone;
 return {locale,timeZone:validTimeZone(detected)?detected:'UTC'};
}
export function validCalendarDate(value:string){
 return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
}
export function formatDateOnly(value:string,locale:string){
 if(!validCalendarDate(value))return value;
 // A preferred visit date is a civil date. It must never shift to the previous day.
 return new Intl.DateTimeFormat(validLocale(locale)?locale:'en',{dateStyle:'long',timeZone:'UTC'}).format(new Date(value+'T00:00:00Z'));
}
export function formatInstant(value:string,locale:string,timeZone:string){
 if(!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)||Number.isNaN(Date.parse(value)))return value;
 return new Intl.DateTimeFormat(validLocale(locale)?locale:'en',{dateStyle:'medium',timeStyle:'short',timeZone:validTimeZone(timeZone)?timeZone:'UTC'}).format(new Date(value));
}
