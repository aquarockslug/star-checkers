local files   = {
	"littlejs.min.js",
	"game.js",
	"ui.js",
}

local output  = "dist/index.html"
local inits   = { "gameInit", "gameUpdate", "null", "gameRender", "postGameRender" }
local channel = "aquarock/star-checkers:html5"

local scripts = {}
for _, path in ipairs(files) do
	local f = io.open(path, "r")
	if f then
		table.insert(scripts, f:read("*all"))
		f:close()
	else
		print("Warning: missing " .. path .. ", skipping")
	end
end

local html = [[<!doctype html><body>]]
for _, s in ipairs(scripts) do
	html = html .. "  <script>\n" .. s .. "\n  </script>\n"
end
html = html .. "  <script>engineInit(" .. table.concat(inits, ", ") .. ")</script>\n</body>"

local out = io.open(output, "w")
if out then
	out:write(html); out:close(); print("Created " .. output)
end

os.execute("butler push " .. output .. " " .. channel)
os.execute("wc -l " .. output)
