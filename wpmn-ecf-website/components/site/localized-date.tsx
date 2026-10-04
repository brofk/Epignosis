'use client';
import {useEffect,useState} from 'react';
import {browserPreferences,formatDateOnly,formatInstant} from '@/lib/locale';
export function LocalizedDate({value,instant=false}:{value:string;instant?:boolean}){
 const [preferences,setPreferences]=useState<{locale:string;timeZone:string}|null>(null);
 useEffect(()=>setPreferences(browserPreferences()),[]);
 const formatted=preferences?(instant?formatInstant(value,preferences.locale,preferences.timeZone):formatDateOnly(value,preferences.locale)):value;
 return <time dateTime={value} title={instant&&preferences?preferences.timeZone:undefined}>{formatted}</time>;
}
