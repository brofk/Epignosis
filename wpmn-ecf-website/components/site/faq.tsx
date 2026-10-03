'use client';
import {Accordion,AccordionItem,AccordionTrigger,AccordionContent} from '@/components/ui/accordion';
export function FAQ({items}:{items:{title:string;answer:string}[]}){return <Accordion type="single" collapsible className="faq-list">{items.map((f,i)=><AccordionItem value={'q'+i} key={i}><AccordionTrigger className="faq-question">{f.title}</AccordionTrigger><AccordionContent className="faq-answer">{f.answer}</AccordionContent></AccordionItem>)}</Accordion>}
