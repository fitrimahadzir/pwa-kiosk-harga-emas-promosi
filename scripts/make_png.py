import zlib
import struct
import math

def create_png(width, height, filename):
    # Palette colors
    bg_r, bg_g, bg_b = 0x29, 0x09, 0x14      # #290914
    surf_r, surf_g, surf_b = 0x45, 0x10, 0x20 # #451020
    accent_r, accent_g, accent_b = 0x83, 0x5B, 0x4F # #835B4F
    gold_r, gold_g, gold_b = 0xCC, 0xA7, 0xA2 # #CCA7A2
    bright_r, bright_g, bright_b = 0xF5, 0xE8, 0xE5 # #F5E8E5

    raw_data = bytearray()
    cx, cy = width / 2.0, height / 2.0
    r_outer = min(width, height) * 0.42
    r_inner = min(width, height) * 0.38
    r_ring = min(width, height) * 0.28

    for y in range(height):
        raw_data.append(0)  # filter type 0 (None)
        for x in range(width):
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            
            # Rounded squircle container
            sq_x = abs(dx) / (width * 0.44)
            sq_y = abs(dy) / (height * 0.44)
            in_squircle = (sq_x**4 + sq_y**4) < 1.0

            if not in_squircle:
                # outside
                r, g, b, a = bg_r, bg_g, bg_b, 255
            elif dist <= r_ring * 0.15:
                # Center sparkling diamond
                r, g, b, a = bright_r, bright_g, bright_b, 255
            elif abs(dx) + abs(dy) < r_ring * 0.9 and abs(dx) + abs(dy) > r_ring * 0.75:
                # Diamond outline
                r, g, b, a = gold_r, gold_g, gold_b, 255
            elif abs(dist - r_inner) < max(2, width * 0.015):
                # Inner gold ring
                r, g, b, a = gold_r, gold_g, gold_b, 255
            elif abs(dist - r_outer) < max(1.5, width * 0.01):
                # Outer accent ring
                r, g, b, a = accent_r, accent_g, accent_b, 255
            elif dist < r_inner:
                # Inner disc
                r, g, b, a = surf_r, surf_g, surf_b, 255
            else:
                # Background inside container
                r, g, b, a = bg_r, bg_g, bg_b, 255

            raw_data.extend((r, g, b, a))

    def chunk(chunk_type, data):
        return (struct.pack('>I', len(data)) +
                chunk_type +
                data +
                struct.pack('>I', zlib.crc32(chunk_type + data) & 0xffffffff))

    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat_data = zlib.compress(bytes(raw_data), 9)

    png_bytes = (b'\x89PNG\r\n\x1a\n' +
                 chunk(b'IHDR', ihdr_data) +
                 chunk(b'IDAT', idat_data) +
                 chunk(b'IEND', b''))

    with open(filename, 'wb') as f:
        f.write(png_bytes)
    print(f"Created {filename} ({width}x{height})")

if __name__ == '__main__':
    create_png(192, 192, 'public/pwa-192x192.png')
    create_png(512, 512, 'public/pwa-512x512.png')
    create_png(512, 512, 'public/pwa-maskable-512x512.png')
    create_png(180, 180, 'public/apple-touch-icon.png')
