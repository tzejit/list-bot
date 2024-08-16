export const nearbyText = "Would you like to get nearby places from your current location or MRT station?"
export const nearbyGetLocText = "Please send your location to find nearby places"
export const nearbyMrtText = "Please send the name of the MRT station to find nearby places"
export const directionText = "Would you like to get directions from your current location or MRT station?"
export const directionGetLocText = "Please send your current location to generate route to "
export const directionMrtText = "Please send the name of the MRT station to generate route to "
export const cuisineText = "Please select the type of cuisine"
export const locationText = "Please select the location type"
export const filterCuisineText = "Please filter the type of cuisine. To select all cuisines, press confirm without selecting anything."
export const filterLocationText = "Please filter the type of location. To select all locations, press confirm without selecting anything."
export const editMessageText = "Please edit the postal code and name"
export const helpText = `Food list bot helps to manage and share food lists! Here's an overview of what it does:

<u>General Terminology</u>
Each view command displays your list or list items in the format: 
1.xxxx
2.xxxx
3.xxxx
Where 1, 2 & 3 are the index numbers or ID numbers.

<u>Create lists</u>
Every user can have multiple food lists created using the /new command and at any 1 time only 1 food list can be active and in use.
Using /viewlist allows you to view the lists that you currently have, and /removelist to remove a list using the index number displayed in /viewlist.
Use the /active command to change your active list to one specified by the index number.

<u>Using your list</u>
Use the /add command to add a food place (using its postal code) to your active list, and use /remove to remove places by their index. 
Items in the list can be viewed using the /view command, and the list can be filtered to specific cuisines and locations using /filter.
To view food places near you use the /nearby command, and to get directions to the food places use the /direction command.

<u>Sharing your lists</u>
To share your list with another user, use the /export command and send the resulting ID to whoever you want to share the list to.
To receive another user's list, use the /import command with the ID given by the export command.
Now both parties are able to view and edit the same list!

Here's an overview of the commands supported:
/new &lt;name&gt;: Creates a new list with the given name 
/view: Shows the content and index of the currently active list
/filter: Shows filtered content of the currently active list
/viewlist: Shows all lists
/add &lt;postalcode name&gt;: Adds an item to the currently active list
/active &lt;index&gt;: Sets the active list to the list with given by index
/remove &lt;index&gt;: Remove item from active list given by index
/removelist &lt;index&gt;: Remove the list given by index
/nearby &lt;distance (optional)&gt;: Returns places nearby within given distance 
/direction &lt;index&gt;: Returns directions to the specified location
/export: Returns a ID to export list by
/import &lt;export id&gt;: Imports a list given it's ID
/help: Displays this help message again
`