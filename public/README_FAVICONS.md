# Favicon Files - Save Instructions

To make your logo appear in search results, save your optimized image files here in the `/public` directory with these exact names:

## Required Files:

1. **favicon.ico** 
   - Size: 32x32 or 16x16 pixels
   - Location: `/public/favicon.ico`
   - Format: ICO file

2. **apple-touch-icon.png**
   - Size: 180x180 pixels  
   - Location: `/public/apple-touch-icon.png`
   - Format: PNG file

## Optional (for better social media sharing):

3. **og-image.png** or **og-image.jpg**
   - Size: 1200x630 pixels (recommended)
   - Location: `/public/og-image.png`
   - Format: PNG or JPG

## How to Save:

1. Download your optimized images from wherever you created them
2. Rename them to match the filenames above exactly
3. Place them in the `/public` folder (same level as `logo.svg`)
4. The metadata is already configured in `app/layout.tsx` to use these files

Once saved, the logo will automatically appear in:
- Browser tabs (favicon)
- Search results (after search engines index)
- Social media shares (Open Graph image)
- iOS home screen (apple-touch-icon)
