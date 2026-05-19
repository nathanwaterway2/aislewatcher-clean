import requests
from bs4 import BeautifulSoup
import csv
import time
import re

BASE_URL = "https://www.kohls.com"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}

STATE_SLUGS = [
    "al","az","ar","ca","co","ct","de","fl","ga","id","il","in","ia","ks",
    "ky","la","me","md","ma","mi","mn","ms","mo","mt","ne","nv","nh","nj",
    "nm","ny","nc","nd","oh","ok","or","pa","ri","sc","sd","tn","tx","ut",
    "vt","va","wa","wv","wi","wy"
]

def get_html(url):
    r = requests.get(url, headers=HEADERS, timeout=15)
    r.raise_for_status()
    return r.text

def get_city_urls(state_slug):
    html = get_html(f"{BASE_URL}/stores/{state_slug}.shtml")
    pattern = rf'href="(/stores/{state_slug}/[a-z0-9\-]+\.shtml)"'
    matches = re.findall(pattern, html)
    city_hrefs = [m for m in matches if not re.search(r'-\d+\.shtml$', m)]
    seen = set()
    result = []
    for h in city_hrefs:
        if h not in seen:
            seen.add(h)
            result.append(BASE_URL + h)
    return result

def get_store_urls(city_url):
    html = get_html(city_url)
    pattern = r'href="(/stores/[a-z]{2}/[a-z0-9\-]+-\d+\.shtml)"'
    matches = re.findall(pattern, html)
    seen = set()
    result = []
    for h in matches:
        if h not in seen:
            seen.add(h)
            result.append(BASE_URL + h)
    return result

def scrape_store(url):
    html = get_html(url)
    soup = BeautifulSoup(html, "html.parser")

    store_id = re.search(r'-(\d+)\.shtml$', url)
    store_id = store_id.group(1) if store_id else ""

    name = ""
    h1 = soup.find("h1")
    if h1:
        name = h1.get_text(strip=True)
    if not name:
        title = soup.find("title")
        name = title.get_text(strip=True).split("|")[0].strip() if title else ""

    lat, lng = "", ""
    m = re.search(r'daddr=([\-\d\.]+),([\-\d\.]+)', html)
    if m:
        lat, lng = m.group(1), m.group(2)

    address, city, state, postal = "", "", "", ""
    full_text = soup.get_text(" ", strip=True)
    addr = re.search(
        r'(\d+\s[\w\s\.]+?(?:BLVD|AVE|ST|DR|RD|PKWY|HWY|TPKE|WAY|LN|CIR|CTR|CT|PL|'
        r'SQ|TRL|PIKE|MALL|CORS|XING|FWY|EXPY)\.?)\s*'
        r'([A-Z][A-Z\s\-]+?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)',
        full_text
    )
    if addr:
        address = addr.group(1).strip()
        city    = addr.group(2).strip()
        state   = addr.group(3).strip()
        postal  = addr.group(4).strip()

    return {
        "id":      store_id,
        "store":   name,
        "city":    city,
        "st":      state,
        "postal":  postal,
        "address": address,
        "lat":     lat,
        "long":    lng,
        "url":     url,
    }

def main():
    output_file = "kohls_geocoded.csv"
    fieldnames  = ["id", "store", "city", "st", "postal", "address", "lat", "long", "url"]

    all_store_urls = []

    for slug in STATE_SLUGS:
        print(f"\nState: {slug.upper()}", end=" → ", flush=True)
        try:
            city_urls = get_city_urls(slug)
            print(f"{len(city_urls)} cities", end=" | ", flush=True)
            for cu in city_urls:
                store_urls = get_store_urls(cu)
                for su in store_urls:
                    if su not in all_store_urls:
                        all_store_urls.append(su)
                time.sleep(0.3)
            print(f"total so far: {len(all_store_urls)}")
        except Exception as e:
            print(f"ERROR: {e}")
        time.sleep(0.5)

    print(f"\n{'='*50}")
    print(f"Total stores to scrape: {len(all_store_urls)}")
    print(f"{'='*50}\n")

    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for i, store_url in enumerate(all_store_urls, 1):
            try:
                row = scrape_store(store_url)
                writer.writerow(row)
                print(f"[{i}/{len(all_store_urls)}] {row['store']} | "
                      f"{row['city']}, {row['st']} {row['postal']} | "
                      f"{row['lat']},{row['long']}")
            except Exception as e:
                print(f"[{i}] ERROR {store_url}: {e}")
            time.sleep(0.4)

    print(f"\nDone! Saved to {output_file}")

if __name__ == "__main__":
    main()