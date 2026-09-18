"""Download licensed illustrative Unsplash photography for local serving."""

from pathlib import Path
from urllib.request import Request, urlopen

images = {
    "hero": ("photo-1441974231531-c6227db76b6e", 1920),
    "forest": ("photo-1473448912268-2022ce9509d8", 1100),
    "coast": ("photo-1518837695005-2083093ee35b", 1100),
    "mountain": ("photo-1464822759023-fed622ff2c3b", 900),
}
directory = Path(__file__).resolve().parents[1] / "frontend/public/images"
directory.mkdir(parents=True, exist_ok=True)
for name, (photo, width) in images.items():
    url = f"https://images.unsplash.com/{photo}?auto=format&fit=crop&w={width}&q=82&fm=webp"
    request = Request(url, headers={"User-Agent": "Darukaa-Hackathon/1.0"})
    with urlopen(request, timeout=60) as response:
        data = response.read()
    (directory / f"{name}.webp").write_bytes(data)
    print(f"Saved {name}.webp ({len(data)} bytes)")
