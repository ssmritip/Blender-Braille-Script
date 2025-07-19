# Python Script for 3D Braille Text in Blender 

This script converts a given text into a 3D Braille representation in Blender. It uses a font file to define the Braille characters, replaces text objects with semi-spheres, and adjusts the positioning of the Braille dots.

## Prerequisites
- Blender installed on your system.
- The required Braille font file is included in the `font` folder within this repository. Ensure the font file is also locally available on your system for the script to work correctly.

## Usage

1. **Open Blender**:
   - Go to the `Scripting` tab in Blender.

2. **Add a New Script**:
   - Click `New` to create a new script.

3. **Copy and Paste the Script**:
   - Copy the provided Python script and paste it into the editor.

4. **Modify the Script**:
    - Update the `braille_text` with your desired text.
    `braille_text = "YourTextHere"`
   - Update the `font_path` variable with the absolute path to your Braille font file:
     ```python
     font_path = r"absolute\path\to\Braille-Regular.ttf"
     ```
5. **Set the Cursor Location**:
   - To set the cursor location accurately, first, add a cube to the scene. Switch to Edit Mode and select the top face of the cube. Then, align the 3D cursor to the top face by pressing `Shift + S` and choosing `Cursor to Selected`. This positions the cursor at the exact location needed for the script to align the Braille representation correctly.

6. **Run the Script**:
   - Press `Alt + P` to execute the script.

## Features
- Converts text into 3D Braille dots using a specified font.
- Adjusts spacing and scales the dots for proper alignment.
- Applies a subdivision modifier and fills the bottom of the semi-spheres.
- Links the generated 3D objects to a new collection named after the input text.

## Notes
- The `font_path` must be an **absolute path** to the font file. 

