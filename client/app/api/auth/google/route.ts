import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const credential = formData.get('credential');

    if (!credential) {
      return NextResponse.redirect(new URL('/', request.url), 303);
    }

    // Redirect back to the login page (root /) with the credential in the URL
    // so the client-side component can read it and authenticate just like it does in popup mode.
    const url = new URL(`/?credential=${credential}`, request.url);
    return NextResponse.redirect(url, 303);
  } catch (error) {
    return NextResponse.redirect(new URL('/', request.url), 303);
  }
}
