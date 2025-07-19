import bpy
import mathutils

def clear_scene():
    """
    Clears all mesh objects from the current Blender scene.
    This helps ensure a clean slate for new generation.
    """
    # Deselect all objects first
    if bpy.ops.object.select_all.poll():
        bpy.ops.object.select_all(action='DESELECT')
    # Select only mesh objects
    if bpy.ops.object.select_by_type.poll():
        bpy.ops.object.select_by_type(type='MESH')
    # Delete selected objects if any exist
    if bpy.context.selected_objects:
        bpy.ops.object.delete()

def create_braille_dot(location, radius, height):
    """
    Creates a single 3D dome-shaped Braille dot (a hemisphere).

    Args:
        location (tuple): (x, y, z) coordinates for the center of the dot's base.
        radius (float): The radius of the spherical part of the dot.
        height (float): The desired height of the dome.
    Returns:
        bpy.types.Object: The created Blender mesh object for the dot.
    """
    # Add a UV sphere as the base shape for the dot
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=radius, enter_editmode=False, align='WORLD', location=location)
    dot_obj = bpy.context.active_object
    dot_obj.name = "BrailleDot"

    # Go into Edit Mode to modify the sphere
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')

    # Bisect the sphere to create a hemisphere, keeping the top part
    bpy.ops.mesh.bisect(plane_co=location, plane_no=(0, 0, 1), clear_inner=True)

    # Return to Object Mode
    bpy.ops.object.mode_set(mode='OBJECT')

    # Apply smooth shading
    bpy.ops.object.select_all(action='DESELECT')
    dot_obj.select_set(True)
#    bpy.ops.object.shade_smooth()

    # Scale the Z-axis to achieve the desired dome height.
    # This is done by directly manipulating vertex coordinates for precision.
    for vert in dot_obj.data.vertices:
        if vert.co.z > 0: # Only scale the top hemisphere part
             vert.co.z *= (height / radius)

    return dot_obj

def generate_braille_text(text_input="Hello World", dot_radius=0.5, dot_height=0.5,
                          dot_spacing_x=2.5, dot_spacing_y=2.5,
                          cell_spacing_x=6.2, line_spacing_y=10.0,
                          base_height=3.0, padding_x=2.0, padding_y=2.0):
    """
    Generates 3D Braille text with a solid base, handling capitalization.

    Args:
        text_input (str): The text to convert. Handles newlines ('\n').
        dot_radius (float): Radius of each Braille dot.
        dot_height (float): Height of each Braille dot.
        dot_spacing_x (float): Horizontal spacing between dots in a cell.
        dot_spacing_y (float): Vertical spacing between dots in a cell.
        cell_spacing_x (float): Horizontal spacing between Braille cells.
        line_spacing_y (float): Vertical spacing between lines of Braille.
        base_height (float): Height of the solid base.
        padding_x (float): Padding for the base's width.
        padding_y (float): Padding for the base's depth.
    """
    clear_scene()

    # Braille mapping, including a special character for capitalization.
    braille_map = {
        'a': [1, 0, 0, 0, 0, 0], 'b': [1, 1, 0, 0, 0, 0], 'c': [1, 0, 0, 1, 0, 0],
        'd': [1, 0, 0, 1, 1, 0], 'e': [1, 0, 0, 0, 1, 0], 'f': [1, 1, 0, 1, 0, 0],
        'g': [1, 1, 0, 1, 1, 0], 'h': [1, 1, 0, 0, 1, 0], 'i': [0, 1, 0, 1, 0, 0],
        'j': [0, 1, 0, 1, 1, 0], 'k': [1, 0, 1, 0, 0, 0], 'l': [1, 1, 1, 0, 0, 0],
        'm': [1, 0, 1, 1, 0, 0], 'n': [1, 0, 1, 1, 1, 0], 'o': [1, 0, 1, 0, 1, 0],
        'p': [1, 1, 1, 1, 0, 0], 'q': [1, 1, 1, 1, 1, 0], 'r': [1, 1, 1, 0, 1, 0],
        's': [0, 1, 1, 1, 0, 0], 't': [0, 1, 1, 1, 1, 0], 'u': [1, 0, 1, 0, 0, 1],
        'v': [1, 1, 1, 0, 0, 1], 'w': [0, 1, 0, 1, 1, 1], 'x': [1, 0, 1, 1, 0, 1],
        'y': [1, 0, 1, 1, 1, 1], 'z': [1, 0, 1, 0, 1, 1],
        '1': [1, 0, 0, 0, 0, 0], '2': [1, 1, 0, 0, 0, 0], '3': [1, 0, 0, 1, 0, 0],
        '4': [1, 0, 0, 1, 1, 0], '5': [1, 0, 0, 0, 1, 0], '6': [1, 1, 0, 1, 0, 0],
        '7': [1, 1, 0, 1, 1, 0], '8': [1, 1, 0, 0, 1, 0], '9': [0, 1, 0, 1, 0, 0],
        '0': [0, 1, 0, 1, 1, 0],
        'CAPS': [0, 0, 0, 0, 0, 1], # Dot 6 indicates a capital letter.
    }

    dot_relative_positions = [
        (0, 2 * dot_spacing_y), (0, dot_spacing_y), (0, 0),
        (dot_spacing_x, 2 * dot_spacing_y), (dot_spacing_x, dot_spacing_y), (dot_spacing_x, 0)
    ]

    def _generate_cell(pattern, x, y):
        """Helper function to create the dots for a single Braille cell."""
        for i in range(6):
            if pattern[i] == 1:
                rel_x, rel_y = dot_relative_positions[i]
                dot_location = (x + rel_x, y + rel_y, base_height / 2)
                create_braille_dot(dot_location, dot_radius, dot_height)

    current_y = 0.0
    max_cells_in_line = 0
    lines = text_input.split('\n')
    num_lines = len(lines)

    for line in lines:
        current_x = 0.0
        cells_this_line = 0
        words = line.split(' ')

        for word_index, word in enumerate(words):
            if not word: # Skip empty strings from multiple spaces
                current_x += cell_spacing_x
                cells_this_line += 1
                continue

            # --- Capitalization Logic ---
            if word.isupper() and len(word) > 1:
                for _ in range(2):
                    _generate_cell(braille_map['CAPS'], current_x, current_y)
                    current_x += cell_spacing_x
                    cells_this_line += 1
            elif word and word[0].isupper():
                _generate_cell(braille_map['CAPS'], current_x, current_y)
                current_x += cell_spacing_x
                cells_this_line += 1

            # --- Generate Characters ---
            for char in word.lower():
                pattern = braille_map.get(char, [0,0,0,0,0,0])
                if char not in braille_map:
                    print(f"Warning: Character '{char}' not in map. Using empty cell.")
                _generate_cell(pattern, current_x, current_y)
                current_x += cell_spacing_x
                cells_this_line += 1

            # Add a space cell after each word (except the last one)
            if word_index < len(words) - 1:
                current_x += cell_spacing_x # A space is just an empty cell
                cells_this_line += 1

        if cells_this_line > max_cells_in_line:
            max_cells_in_line = cells_this_line
        
        current_y -= line_spacing_y

    # --- Create the solid base ---
    if max_cells_in_line == 0:
        print("No text to generate. Aborting base creation.")
        return

    # --- FIX APPLIED HERE ---
    # This section calculates the dimensions and position of the base plate
    # by first determining the bounding box of the dot origins, then accounting
    # for the dot radius to get the true geometric size.

    # Calculate the span of the dot origins (center points)
    origin_span_x = (max_cells_in_line - 1) * cell_spacing_x + dot_spacing_x
    highest_y_origin = 2 * dot_spacing_y
    lowest_y_origin = -((num_lines - 1) * line_spacing_y)
    origin_span_y = highest_y_origin - lowest_y_origin

    # Calculate the full geometric bounding box by adding the dot radius on all sides
    geom_width = origin_span_x + (2 * dot_radius)
    geom_depth = origin_span_y + (2 * dot_radius)

    # Calculate the final base dimensions including padding
    base_width = geom_width + (2 * padding_x)
    base_depth = geom_depth + (2 * padding_y)

    # Calculate the center of the base. This is based on the center of the dot origins.
    # The dot radius does not affect the center position.
    base_center_x = origin_span_x / 2
    base_center_y = (highest_y_origin + lowest_y_origin) / 2
    base_center_z = 0

    # Add and scale the cube for the base
    bpy.ops.mesh.primitive_cube_add(size=1, enter_editmode=False, align='WORLD',
                                      location=(base_center_x, base_center_y, base_center_z))
    base_obj = bpy.context.active_object
    base_obj.name = "BrailleBase"
    base_obj.scale = (base_width, base_depth, base_height)
    
    # Join all dots and the base into a single object for convenience
    bpy.ops.object.select_all(action='DESELECT')
    base_obj.select_set(True)
    bpy.context.view_layer.objects.active = base_obj
    
    # Select all mesh objects to be joined
    bpy.ops.object.select_by_type(type='MESH')
    bpy.ops.object.join()

    print("Braille generation complete!")


# --- How to use the script ---
# 1. Open Blender and go to the "Scripting" workspace.
# 2. Copy and paste this entire script into the Text Editor.
# 3. Modify the 'text_to_braille' variable below. Use '\n' for new lines.
# 4. Click the "Run Script" button (play icon).

text_to_braille = "Chain for Change"

generate_braille_text(
    text_input=text_to_braille,
    dot_radius=0.85,      # Standard dot base radius
    dot_height=0.768612,       # Standard dot height
    dot_spacing_x=2.5,    # Horizontal spacing between dots in a cell
    dot_spacing_y=2.5,    # Vertical spacing between dots in a cell
    cell_spacing_x=7,   # Horizontal spacing between cells
    line_spacing_y=10.0,  # Vertical spacing between lines
    base_height=3.0,      # Height of the base
    padding_x=3.0,        # Padding on X-axis for the base
    padding_y=3.0         # Padding on Y-axis for the base
)