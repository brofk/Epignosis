import type {ComponentProps} from 'react';

// Public page navigation uses the browser directly. It must keep working when
// client routing, prefetching, or an embedded browser cannot complete an RSC request.
export default function SiteLink(props: ComponentProps<'a'> & {href: string}) {
  return <a {...props}/>;
}
