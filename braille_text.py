import bpy
import mathutils

# Update braille_text to the text that you want to input
braille_text = "qbcde"  

# Update font_path to the absolute path of the font file on the system
font_path = r"D:\blender\Scripts\font\Braille-Regular.ttf"

# Create a new collection with the name of the braille_text
collection_name = braille_text
if collection_name not in bpy.data.collections:
    braille_collection = bpy.data.collections.new(collection_name)
    bpy.context.scene.collection.children.link(braille_collection)
else:
    braille_collection = bpy.data.collections[collection_name]

# Adding a text object
bpy.ops.object.text_add()
text_obj = bpy.context.object

# Setting the text and font
text_obj.data.body = braille_text
font = bpy.data.fonts.load(filepath=font_path)
text_obj.data.font = font

# Adjust the spacing between letters while it's still a text object
text_obj.data.space_character = 0.7

# Convert the text object to a mesh
bpy.ops.object.convert(target='MESH')

# Switch to Edit Mode and separate the parts 
bpy.ops.object.editmode_toggle()  # Switch to Edit Mode
bpy.ops.mesh.separate(type='LOOSE')  # Separate by loose parts 
bpy.ops.object.editmode_toggle()  # Switch back to Object Mode

# Store the parts (dots)
separated_dots = [obj for obj in bpy.context.view_layer.objects if obj.name.startswith(text_obj.name)]

# Replacing each dot with a semisphere 
created_spheres = []
for dot in separated_dots:
    # Setting the origin of the object to its geometry center 
    bpy.context.view_layer.objects.active = dot
    bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS', center='BOUNDS')
    
    loc = dot.location.copy()  # Storing the location
    
    # Adding a UV sphere at the dot's location
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.1, location=loc)  
    new_sphere = bpy.context.object

    # Switch to Edit Mode to modify the sphere
    bpy.ops.object.mode_set(mode='EDIT')

    # Converting the sphere into a semisphere
    bpy.ops.mesh.select_all(action='DESELECT')  
    bpy.ops.object.mode_set(mode='OBJECT')  # Switch to Object Mode to access vertex data
    for vert in new_sphere.data.vertices:
        if vert.co.z < 0:  # Select vertices below the XZ plane
            vert.select = True

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.delete(type='VERT')  # Delete the selected vertices (lower half)

    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Move the sphere to the braille collection
    bpy.context.collection.objects.unlink(new_sphere)  # Unlink from the current collection
    braille_collection.objects.link(new_sphere)  # Link to the new collection

    # Set the active layer collection to the braille_collection
    for layer in bpy.context.view_layer.layer_collection.children:
        if layer.name == collection_name:
            bpy.context.view_layer.active_layer_collection = layer
            break

    created_spheres.append(new_sphere)
   
    # Remove the original dot object
    bpy.data.objects.remove(dot)

for sphere in created_spheres:
    sphere.select_set(True)

bpy.ops.transform.resize(value=(17/2, 17/2, 0.769*10)) 

bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# Calculate the center of all spheres
center_of_spheres = mathutils.Vector((0, 0, 0))
for sphere in created_spheres:
    center_of_spheres += sphere.location
center_of_spheres /= len(created_spheres)  # Average position of all spheres

# Get the 3D cursor location
cursor_location = bpy.context.scene.cursor.location

# Calculate the offset needed to move the center to the cursor
offset = cursor_location - center_of_spheres

# Adjust the scaling factor for the spacing between spheres
spacing_factor = 0.9 
for sphere in created_spheres:
    # Calculate the vector from the center to the sphere
    relative_position = sphere.location - center_of_spheres
    
    # Scale the relative position to adjust the spacing
    scaled_position = relative_position * spacing_factor
    
    # Update the sphere's location
    sphere.location.x = center_of_spheres.x + scaled_position.x + offset.x
    sphere.location.y = center_of_spheres.y + scaled_position.y + offset.y
  
    # Apply subdivision modifier of level 1
    modifier = sphere.modifiers.new(name="Subdivision", type='SUBSURF')
    modifier.levels = 1  # Set the subdivision levels
    bpy.context.view_layer.objects.active = sphere  
    bpy.ops.object.modifier_apply(modifier="Subdivision")  # Apply the modifier
    
    
for sphere in created_spheres:
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=True)
    # Switch to Edit Mode to process the sphere
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT') 
     # Fill the hole at the bottom
    bpy.ops.mesh.select_mode(type="EDGE")  # Switch to edge selection mode
    bpy.ops.mesh.select_non_manifold()  # Select open edges
    bpy.ops.mesh.edge_face_add()  # Fill the selected edge loop to create a face
    bpy.ops.object.mode_set(mode='OBJECT')
    # changing z position
    sphere.location.z = cursor_location.z + 0.125  