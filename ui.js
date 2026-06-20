let uiRoot, uiSettings;

function setupUI() {
	new UISystemPlugin();

	uiSystem.defaultSoundPress = new Sound([0.5, 0, 220]);
	uiSystem.defaultSoundClick = new Sound([0.5, 0, 440]);
	uiSystem.defaultCornerRadius = 8;
	uiSystem.defaultGradientColor = SANDLIGHTBROWN;
	uiSystem.defaultShadowColor = new Color(0, 0, 0, 0.3);

	uiRoot = new UIObject();
	uiRoot.anchor = vec2(-1, -1);

	// menu button (top-left corner)
	const menuButton = new UIButton(vec2(35), vec2(50, 45));
	menuButton.color = new Color(0.9, 0.8, 0.6, 0.8);
	menuButton.gradientColor = new Color(0.78, 0.28, 0.03, 0.6);
	menuButton.onClick = () => toggleSettings();
	uiRoot.addChild(menuButton);
	for (let i = -1; i <= 1; ++i) {
		const line = new UIObject(vec2(0, i * 9), vec2(26, 4));
		line.color = SANDLIGHTBROWN;
		line.gradientColor = undefined;
		line.lineWidth = 0;
		line.shadowColor = new Color(0, 0, 0, 0);
		line.canBeHover = false;
		menuButton.addChild(line);
	}

	uiSettings = new UIObject(vec2(360, 360), vec2(400, 360));
	uiSettings.color = SANDLIGHTBROWN;
	uiSettings.gradientColor = new Color(0.88, 0.7, 0.45, 0.95);
	uiSettings.lineWidth = 4;
	uiSettings.visible = false;
	uiRoot.addChild(uiSettings);

	// Title
	const titleText = new UIText(vec2(0, -155), vec2(350, 40), "Game Settings");
	titleText.textColor = SANDRED;
	titleText.textLineWidth = 4;
	uiSettings.addChild(titleText);

	// Guides
	const guidesCheck = new UICheckbox(vec2(-140, -95), vec2(40));
	guidesCheck.checked = MOVEGUIDES;
	guidesCheck.text = "Guides";
	guidesCheck.onChange = () => {
		MOVEGUIDES = guidesCheck.checked;
		GOALGUIDE = guidesCheck.checked;
	};
	uiSettings.addChild(guidesCheck);

	// Game Speed slider
	const speedLabel = new UIText(vec2(-150, -10), vec2(150, 25), "Speed");
	speedLabel.textColor = HOLECOLOR;
	speedLabel.textLineWidth = 2;
	uiSettings.addChild(speedLabel);

	const speedSlider = new UISlider(vec2(30, -10), vec2(230, 30));
	speedSlider.value = 0.5;
	speedSlider.onChange = () => {
		const v = speedSlider.value;
		CPU_MOVE_DELAY = 1.2 - v * 1.15;
		const mult = 2 - v * 1.6;
		const dur = Math.round(12 * mult);
		ANIMATION_SPEED.CPU_DURATION = dur;
		ANIMATION_SPEED.HUMAN_DURATION = dur;
		const labels = ["Very Slow", "Slow", "Normal", "Fast", "Very Fast"];
		const idx = v < 0.2 ? 0 : v < 0.4 ? 1 : v < 0.6 ? 2 : v < 0.8 ? 3 : 4;
		speedSlider.text = labels[idx];
	};
	speedSlider.onChange();
	uiSettings.addChild(speedSlider);

	// Reset Game button
	const resetButton = new UIButton(vec2(0, 80), vec2(300, 45), "Reset Game");
	resetButton.color = HOLECOLOR;
	resetButton.onClick = () => {
		uiSystem.showConfirmDialog("Reset game?", () => {
			resetGame();
			setSettingsVisible(false);
		});
	};
	uiSettings.addChild(resetButton);

	// Close button
	const closeButton = new UIButton(vec2(0, 140), vec2(300, 45), "Close");
	closeButton.color = HOLECOLOR;
	closeButton.onClick = () => setSettingsVisible(false);
	uiSettings.addChild(closeButton);
}

function getSettingsVisible() {
	return uiSettings.visible;
}

function setSettingsVisible(visible) {
	uiSettings.visible = visible;
}

function toggleSettings() {
	uiSettings.visible = !uiSettings.visible;
}

function gameUpdatePost() {
	if (keyWasPressed("Escape") && !uiSystem.confirmDialog) {
		toggleSettings();
	}
	setPaused(getSettingsVisible());
}
