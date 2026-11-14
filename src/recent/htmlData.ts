// HanWeb government lists expose their public records inside non-executable XML
// script blocks. Expand only that data format, never JavaScript or private APIs.
export function expandPublicListingData(html:string):string {
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi,(whole:string,attributes:string,body:string)=>{
    if(!/\btype\s*=\s*(['"])(?:text|application)\/xml\1/i.test(attributes)) return whole;
    return body.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1');
  });
}
