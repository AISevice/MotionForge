#!/bin/bash
# Download AI-generated images from Pollinations for ImagineAI
cd "/c/Users/Navneet/Documents/QR/New folder (2)/images" || exit 1

dl() {
  local name="$1"; local prompt="$2"; local seed="$3"
  local ok=0
  for attempt in 1 2 3; do
    curl -sL --max-time 150 -G "https://image.pollinations.ai/prompt/" \
      --data-urlencode "prompt=$prompt" \
      --data-urlencode "width=1024" \
      --data-urlencode "height=1024" \
      --data-urlencode "nologo=true" \
      --data-urlencode "seed=$seed" \
      -o "$name"
    if [ -s "$name" ] && [ "$(head -c 3 "$name" | od -An -tx1 | tr -d ' \n')" = "ffd8ff" ]; then
      echo "OK   $name"
      ok=1
      break
    fi
    echo "RETRY $name (attempt $attempt)"
    sleep 4
  done
  [ "$ok" = "1" ] || echo "FAIL $name"
  sleep 2
}

dl hero-main.jpg "ultra detailed futuristic cyberpunk city at night, neon lights reflecting on wet streets, flying cars, cinematic digital art, volumetric lighting, 8k" 11
dl hero-side.jpg "breathtaking cosmic nebula galaxy with vibrant purple and cyan clouds, stars, deep space digital art, ultra detailed" 22
dl gallery-1.jpg "cyberpunk city street at night, glowing neon signs, rain, cinematic ai generated digital art, highly detailed" 33
dl gallery-2.jpg "enchanted emerald forest with glowing fireflies and magical light rays, fantasy digital art, ultra detailed" 44
dl gallery-3.jpg "surreal desert landscape at sunset, giant glowing sun, purple and orange gradient sky, sand dunes, dreamlike digital art" 55
dl gallery-4.jpg "astronaut floating in deep space surrounded by colorful nebula and stars, epic cinematic digital art" 66
dl gallery-5.jpg "glowing neon flowers blooming in the dark, bioluminescent petals, cyan and pink light, macro digital art" 77
dl gallery-6.jpg "magical underwater scene, deep blue ocean with sun rays piercing through, whales and glowing particles, cinematic digital art" 88
dl gallery-7.jpg "golden hour mountain valley, warm sunlight, mist, birds, cinematic landscape, ultra realistic digital art" 99
dl gallery-8.jpg "serene jade green zen garden with mist, koi pond, cherry blossom, asian fantasy digital art, peaceful" 100
dl preset-1.jpg "futuristic concept sports car on a neon city highway, motion blur, cinematic digital art" 111
dl preset-2.jpg "majestic waterfall in a lush fantasy valley, aerial view, cinematic, ultra detailed digital art" 122
dl preset-3.jpg "epic mountain range at sunrise, sweeping panoramic view, dramatic clouds, cinematic digital art" 133
dl preset-4.jpg "futuristic space station orbiting a colorful planet with rings, cinematic sci-fi digital art" 144
dl preset-5.jpg "close-up portrait of a futuristic android woman with glowing circuits, cinematic lighting, hyperrealistic digital art" 155
dl preset-6.jpg "dramatic dragon flying over a castle on a cliff, epic fantasy digital art, cinematic lighting" 166
dl preset-7.jpg "luxury sailing yacht gliding over crystal clear turquoise sea, aerial drone shot, cinematic digital art" 177
dl preset-8.jpg "floating islands in the sky with waterfalls and airships, dreamy fantasy digital art, vibrant colors" 188
dl story.jpg "futuristic creative studio where artists and engineers work with holographic screens and AI, cinematic digital art" 199

echo "=== DONE ==="
