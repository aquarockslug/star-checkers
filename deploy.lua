-- Script to combine game.js and littlejs.js into index.html

local engine_file = io.open("littlejs.min.js", "r")
if not engine_file then
	print("Error: Could not open littlejs.js")
	return
end
local engine_content = engine_file:read("*all")
engine_file:close()

local game_file = io.open("game.js", "r")
if not game_file then
	print("Error: Could not open game.js")
	return
end
local game_content = game_file:read("*all")
game_file:close()

local combined_content = [[<!doctype html>
<body>
  <script>
]] .. engine_content .. [[
  </script>
  <script>
]] .. game_content .. [[
  </script>
  <script>engineInit(gameInit, gameUpdate, null, gameRender, postGameRender)</script>
</body>
]]

-- write the combined content to index.html
local output_file = io.open("index.html", "w")
if not output_file then
	print("Error: Could not write to index.html")
	return
end
output_file:write(combined_content)
output_file:close()

local highlight = function(text) return "\x1b[1m\x1b[35m" .. text .. "\x1b[0m" end
print(highlight("Successfully created index.html"))

local push = function(file, address, channel)
	print(highlight(string.format(highlight("Uploading") .. " %s to %s:%s", file, address, channel)))
	os.execute(string.format("butler push %s %s:%s", file, address, channel))
end

push("./index.html", "aquarock/mancalajs", "html5")
