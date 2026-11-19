'use client';
import Link from 'next/link';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="editor-access"><div className="editor-access-card"><h1>We could not load this page.</h1><p>Please try again. If you need to contact ECF, call 0906 329 4940 or 0966 387 9553.</p><button className="button" onClick={reset}>Try again</button><Link className="text-link" href="/">Return to homepage</Link></div></main>}
