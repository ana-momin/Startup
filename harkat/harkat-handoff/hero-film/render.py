"""Render the hero film: deterministic render(t) per frame -> Playwright -> ffmpeg.
Usage: pip install playwright && playwright install chromium && python render.py
Output: harkat-hero.mp4 (1920x1080, 30fps, silent; SFX is mixed afterwards).
"""
import asyncio, os, subprocess
from playwright.async_api import async_playwright
FPS = 30
DUR = 20.0
async def main():
    ff = subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','image2pipe','-framerate',str(FPS),'-c:v','mjpeg','-i','-',
        '-c:v','libx264','-pix_fmt','yuv420p','-crf','20','-preset','slow','-movflags','+faststart','harkat-hero.mp4'], stdin=subprocess.PIPE)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1920,'height':1080})
        await pg.goto('file://' + os.path.abspath('film.html'))
        await pg.wait_for_function('window.READY===true')
        for i in range(int(DUR*FPS)):
            await pg.evaluate(f'render({i/FPS})')
            ff.stdin.write(await pg.screenshot(type='jpeg', quality=95))
        await b.close()
    ff.stdin.close(); ff.wait()
asyncio.run(main())
