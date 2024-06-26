import { chromium, } from 'playwright';
import { JSDOM } from 'jsdom';
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'node:path';
import { Context } from 'vm';
import { TIMEOUT } from 'dns';
import { constants } from 'buffer';
import fs from 'fs';
import { title } from 'process';

const atristlist = ["中島みゆき", "Official髭男dism", "Mr.Children"]
const baseurl = new URL("https://gakufu.gakki.me");
const browser = await chromium.launch();
const context = await browser.newContext();

// console.log(tmp.chords);

for (const art of atristlist) {
    const songinfolist = await getUrls(art);

    for (const info of songinfolist) {
        console.log("downloading:", info.url.toString());
        await getChords(info);
        console.log("donloaded! title:", info.title);
        await writesonginfo(info);
    }
}

await browser.close();



type SongInfo = {
    url: URL;
    title: string;
    author: string;
    chords: string[];
}

async function getUrls(q: string) {
    var index = 1;
    var urllist: URL[] = [];
    var titlelist: string[] = [];
    const authordir = join("out/", q);
    await mkdir(authordir, { recursive: true });
    //すでにダウンロードされているファイルの取得
    const directorypath = "out/" + q;
    const filenames = fs.readdirSync(directorypath).map(e => e.replaceAll(".json", ""));

    // console.log(q);
    do {
        const url = new URL("/search/?mode=list&word=AT:" + q + "&page=" + index.toString(), baseurl);
        console.log("connecting...:" + url.toString());
        const page = await context.newPage();
        await page.goto(url.toString(), { timeout: 1000000 });
        await page.waitForTimeout(1000);
        const html = new JSDOM(await page.content());
        const titleelements = html.window.document.querySelectorAll("p.mname");
        var urlelements = html.window.document.querySelectorAll("a[href*='/m']");
        const titles = [...titleelements].map(e => (e as HTMLAnchorElement).textContent!.replaceAll("\n", "").replaceAll(q, "").replaceAll("/", "_").replaceAll(" ", ""));
        const urls = [...urlelements].map(e => (e as HTMLAnchorElement).href).map(e => new URL(e, baseurl));
        titlelist = [...titlelist, ...titles];
        urllist = [...urllist, ...urls];
        index += 1;
    } while (urlelements.length == 100);
    var result = titlelist.map((item, index) => {
        return {
            author: q,
            title: item,
            url: urllist[index],
            chords: []
        };
    });
    result = result.filter(e => !filenames.includes(e.title));
    console.log("get:", result.length, "urls");
    return result;
}

async function getChords(songinfo: SongInfo) {
    var chords: string[];
    const page = await context.newPage();
    // console.log(url.toString());
    await page.goto(songinfo.url.toString(), { timeout: 1000000 });
    await page.waitForTimeout(1000);
    const html = new JSDOM(await page.content());
    const chordelement = html.window.document.querySelectorAll("div[class='cd_pic cd_font']");
    chords = [...chordelement].map(e => (e as HTMLAnchorElement).textContent!.replaceAll(/\s/g, "").replaceAll("／", "").replaceAll("N.C.", "").replaceAll("(2/4)", "")).filter(e => e !== "");
    songinfo.chords = chords;
}

async function getSongInfo(url: URL) {
    var chords: string[][] = [];
    const page = await context.newPage();
    // console.log(url.toString());
    await page.goto(url.toString(), { timeout: 1000000 });
    await page.waitForTimeout(1000);
    const html = new JSDOM(await page.content());
    const { document } = html.window;
    const version = document.querySelector("div.version")?.textContent!;
    var title = document.querySelector("h2.tit > span")!.textContent!;
    const author = document.querySelector("h2.tit > small")!.textContent!;
    if (version !== undefined) {
        title = title + version;
    }
    // console.log(author);
    const anchorelements = document.querySelectorAll("dl[id='chg_key']")[0].querySelectorAll("a[href*='/m/index2.php?p=']");
    // console.log(tmpelem.length);
    const urlchangekeys = [...anchorelements].map(e => (e as HTMLAnchorElement).href).map(e => new URL(e, baseurl));
    for (const i of urlchangekeys) {
        // console.log(i.toString());
        await page.goto(i.toString(), { timeout: 1000000 });
        await page.waitForTimeout(1000);
        const chordhtml = new JSDOM(await page.content());
        const chordselem = chordhtml.window.document.querySelectorAll("span.cd_fontpos");
        const chord = [...chordselem].map(e => (e as HTMLAnchorElement).textContent!);
        chords = [...chords, chord]
    }
    return { title, author, chords }
}

async function writesonginfo(songinfo: SongInfo) {
    const authordir = join("out/", songinfo.author.replaceAll(" ", ""));
    await mkdir(authordir, { recursive: true });
    await writeFile(join(authordir, songinfo.title) + ".json", JSON.stringify(songinfo.chords));
}

/*
*/