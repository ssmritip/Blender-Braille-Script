import bpy
import mathutils

def create_braille_spheres(text: str, font_path: str):
    """
    Takes regular input text (e.g., 'Hello World'), converts it to Braille symbols
    with proper capitalization and spacing, and generates semispheres in Blender.
    """
    # Constants for Braille formatting
    capital = "\u2820"  # Braille capital sign ⠠
    space = "\u2800"    # Braille space ⠀

    # Process the input to Braille-compatible string
    braille_text = ""
    for char in text:
        if char.isupper():
            braille_text += capital + char.lower()
        elif char == " ":
            braille_text += space
        else:
            braille_text += char

    # Create a new collection named after the original text
    collection_name = text.strip().replace(" ", "_")[:50]
    if collection_name not in bpy.data.collections:
        braille_collection = bpy.data.collections.new(collection_name)
        bpy.context.scene.collection.children.link(braille_collection)
    else:
        braille_collection = bpy.data.collections[collection_name]

    # Add a new text object with Braille body
    bpy.ops.object.text_add()
    text_obj = bpy.context.object
    text_obj.data.body = braille_text
    font = bpy.data.fonts.load(filepath=font_path)
    text_obj.data.font = font
    text_obj.data.space_character = 0.7

    # Convert text to mesh and separate loose parts
    bpy.ops.object.convert(target='MESH')
    bpy.ops.object.editmode_toggle()
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.editmode_toggle()

    separated_dots = [obj for obj in bpy.context.view_layer.objects if obj.name.startswith(text_obj.name)]
    created_spheres = []

    for dot in separated_dots:
        bpy.context.view_layer.objects.active = dot
        bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS', center='BOUNDS')
        loc = dot.location.copy()
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=loc)
        new_sphere = bpy.context.object

        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.ops.object.mode_set(mode='OBJECT')
        for vert in new_sphere.data.vertices:
            if vert.co.z < 0:
                vert.select = True
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.delete(type='VERT')
        bpy.ops.object.mode_set(mode='OBJECT')

        bpy.context.collection.objects.unlink(new_sphere)
        braille_collection.objects.link(new_sphere)

        for layer in bpy.context.view_layer.layer_collection.children:
            if layer.name == collection_name:
                bpy.context.view_layer.active_layer_collection = layer
                break

        created_spheres.append(new_sphere)
        bpy.data.objects.remove(dot)

    for sphere in created_spheres:
        sphere.select_set(True)
    bpy.ops.transform.resize(value=(17 / 2, 17 / 2, 0.769 * 10))
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    # Centering logic
    center = sum((s.location for s in created_spheres), mathutils.Vector()) / len(created_spheres)
    cursor_location = bpy.context.scene.cursor.location
    offset = cursor_location - center

    spacing_factor = 0.9
    for sphere in created_spheres:
        relative = sphere.location - center
        scaled = relative * spacing_factor
        sphere.location = center + scaled + offset

        modifier = sphere.modifiers.new(name="Subdivision", type='SUBSURF')
        modifier.levels = 1
        bpy.context.view_layer.objects.active = sphere
        bpy.ops.object.modifier_apply(modifier="Subdivision")

    for sphere in created_spheres:
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.ops.mesh.select_mode(type="EDGE")
        bpy.ops.mesh.select_non_manifold()
        bpy.ops.mesh.edge_face_add()
        bpy.ops.object.mode_set(mode='OBJECT')

    return created_spheres


if __name__ == "__main__":
    braille_text = "Hello World"
    font_path = r"D:\3D Modelling\blender\Scripts\font\Braille-Regular.ttf"

    create_braille_spheres(braille_text, font_path)
