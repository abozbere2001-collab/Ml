import {NextRequest, NextResponse} from 'next/server';

const API_FOOTBALL_HOST = 'v3.football.api-sports.io';
const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;

export async function GET(
  req: NextRequest,
  {params}: {params: {path: string[]}}
) {
  if (!API_KEY) {
    return NextResponse.json(
      {error: 'API key is not configured'},
      {status: 500}
    );
  }

  const searchParams = req.nextUrl.search;
  const apiPath = params.path.join('/');
  const apiUrl = `https://${API_FOOTBALL_HOST}/${apiPath}${searchParams}`;

  try {
    const res = await fetch(apiUrl, {
      headers: {
        'x-rapidapi-host': API_FOOTBALL_HOST,
        'x-rapidapi-key': API_KEY,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        {error: 'API request failed', details: errorText},
        {status: res.status}
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      {error: 'An internal error occurred'},
      {status: 500}
    );
  }
}
