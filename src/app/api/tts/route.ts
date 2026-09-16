import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * High-quality Thai Text-to-Speech Proxy Endpoint
 * Streams native Thai audio from Google TTS (tw-ob)
 * No API key needed, zero dependencies, works across all browsers and devices.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawText = searchParams.get('text') || '';
  const text = rawText.trim().slice(0, 250);

  if (!text) {
    return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
  }

  try {
    const googleTtsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=${encodeURIComponent(text)}`;

    const res = await fetch(googleTtsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'audio/mpeg, audio/*',
        'Referer': 'https://translate.google.com/',
      },
    });

    if (!res.ok) {
      console.warn(`[TTS] Google TTS upstream responded with status ${res.status}`);
      return NextResponse.json(
        { error: `Upstream TTS failed: ${res.statusText}` },
        { status: 502 }
      );
    }

    const audioBuffer = await res.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('[TTS] Error generating Thai speech:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
