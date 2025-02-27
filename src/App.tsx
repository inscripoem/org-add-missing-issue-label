import { useState } from "react";
import {
	Container,
	Box,
	TextField,
	Button,
	Typography,
	Paper,
	List,
	ListItem,
	ListItemText,
	IconButton,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	InputAdornment,
	Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { Octokit } from "octokit";

// Define Label interface
interface Label {
	name: string;
	color: string;
}

// Define Log interface
interface LogEntry {
	message: string;
	timestamp: Date;
	type: "info" | "success" | "error" | "progress";
}

// Default labels
const defaultLabels: Label[] = [
	{ name: "Prio: High", color: "CA49BC" },
	{ name: "Prio: Medium", color: "AF98C6" },
	{ name: "Prio: Low", color: "FDF3BF" },
];

function App() {
	// State management
	const [token, setToken] = useState("");
	const [orgName, setOrgName] = useState("");
	const [labels, setLabels] = useState<Label[]>(defaultLabels);
	const [newLabelName, setNewLabelName] = useState("");
	const [newLabelColor, setNewLabelColor] = useState("");
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [status, setStatus] = useState("");
	const [logs, setLogs] = useState<LogEntry[]>([]);

	// Add log entry
	const addLog = (message: string, type: LogEntry["type"] = "info") => {
		setLogs((prev) => [
			...prev,
			{
				message,
				timestamp: new Date(),
				type,
			},
		]);
	};

	// Handle adding new label
	const handleAddLabel = () => {
		if (newLabelName && newLabelColor) {
			setLabels([
				...labels,
				{ name: newLabelName, color: newLabelColor.replace("#", "") },
			]);
			addLog(`添加了新标签: ${newLabelName}`, "success");
			setNewLabelName("");
			setNewLabelColor("");
			setIsDialogOpen(false);
		}
	};

	// Handle removing label
	const handleRemoveLabel = (index: number) => {
		const removedLabel = labels[index];
		const newLabels = [...labels];
		newLabels.splice(index, 1);
		setLabels(newLabels);
		addLog(`删除了标签: ${removedLabel.name}`, "info");
	};

	// Handle form submission
	const handleSubmit = async () => {
		if (!token || !orgName) {
			setStatus("请填写GitHub Token和组织名称");
			addLog("错误：缺少GitHub Token或组织名称", "error");
			return;
		}

		setIsProcessing(true);
		setStatus("正在处理...");
		setLogs([]); // Clear previous logs
		addLog("开始处理标签同步...", "info");

		try {
			const octokit = new Octokit({ auth: token });

			// Get all repositories
			addLog(`正在获取组织 ${orgName} 的仓库列表...`, "progress");
			const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
				org: orgName,
				per_page: 100,
			});
			addLog(`找到 ${repos.length} 个仓库`, "success");

			let totalLabelsAdded = 0;

			for (const repo of repos) {
				addLog(`正在处理仓库: ${repo.name}`, "progress");

				// Get existing labels
				const existingLabels = await octokit.paginate(
					octokit.rest.issues.listLabelsForRepo,
					{
						owner: orgName,
						repo: repo.name,
						per_page: 100,
					},
				);

				const existingLabelNames = existingLabels.map(
					(label: { name: string }) => label.name,
				);

				// Add missing labels
				for (const label of labels) {
					if (!existingLabelNames.includes(label.name)) {
						await octokit.rest.issues.createLabel({
							owner: orgName,
							repo: repo.name,
							name: label.name,
							color: label.color,
						});
						totalLabelsAdded++;
						addLog(
							`在仓库 ${repo.name} 中添加了标签: ${label.name}`,
							"success",
						);
					}
				}
			}

			const finalMessage = `处理完成！共处理 ${repos.length} 个仓库，添加了 ${totalLabelsAdded} 个标签。`;
			setStatus(finalMessage);
			addLog(finalMessage, "success");
		} catch (error) {
			if (error instanceof Error) {
				const errorMessage = `错误: ${error.message}`;
				setStatus(errorMessage);
				addLog(errorMessage, "error");
			} else {
				setStatus("发生未知错误");
				addLog("发生未知错误", "error");
			}
		} finally {
			setIsProcessing(false);
		}
	};

	return (
		<Container maxWidth="md" sx={{ py: 4, margin: "0 auto" }}>
			<Stack spacing={3} alignItems="center">
				<Typography variant="h4" component="h1" gutterBottom align="center">
					GitHub组织标签批量添加
				</Typography>

				<Paper sx={{ p: 3, width: "100%" }}>
					<Stack spacing={2}>
						<TextField
							fullWidth
							type="password"
							label="GitHub Token"
							value={token}
							onChange={(e) => setToken(e.target.value)}
						/>

						<TextField
							fullWidth
							label="组织名称"
							value={orgName}
							onChange={(e) => setOrgName(e.target.value)}
						/>
					</Stack>
				</Paper>

				{/* 显示状态信息 */}
				{status && (
					<Typography variant="body1" color="text.secondary">
						{status}
					</Typography>
				)}

				<Paper sx={{ p: 3, width: "100%" }}>
					<Box
						sx={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							mb: 2,
						}}
					>
						<Typography variant="h6">标签列表</Typography>
						<Button
							startIcon={<AddIcon />}
							variant="contained"
							onClick={() => setIsDialogOpen(true)}
						>
							添加标签
						</Button>
					</Box>

					<List>
						{labels.map((label, index) => (
							<ListItem
								key={`${label.name}-${label.color}`}
								secondaryAction={
									<IconButton
										edge="end"
										onClick={() => handleRemoveLabel(index)}
									>
										<DeleteIcon />
									</IconButton>
								}
							>
								<ListItemText
									primary={label.name}
									secondary={
										<Box
											component="span"
											sx={{
												backgroundColor: `#${label.color}`,
												width: 50,
												height: 20,
												display: "inline-block",
												verticalAlign: "middle",
												ml: 1,
												borderRadius: 1,
											}}
										/>
									}
								/>
							</ListItem>
						))}
					</List>
				</Paper>

				<Button
					variant="contained"
					size="large"
					onClick={handleSubmit}
					disabled={isProcessing}
				>
					{isProcessing ? "处理中..." : "开始处理"}
				</Button>

				{/* 日志显示区域 */}
				{logs.length > 0 && (
					<Paper
						sx={{ p: 3, width: "100%", maxHeight: "400px", overflow: "auto" }}
					>
						<Typography variant="h6" gutterBottom>
							处理日志
						</Typography>
						<List dense>
							{logs.map((log) => (
								<ListItem key={`${log.timestamp.getTime()}-${log.message}`}>
									<ListItemText
										primary={log.message}
										secondary={log.timestamp.toLocaleTimeString()}
										sx={{
											"& .MuiListItemText-primary": {
												color:
													log.type === "error"
														? "error.main"
														: log.type === "success"
															? "success.main"
															: log.type === "progress"
																? "info.main"
																: "text.primary",
											},
										}}
									/>
								</ListItem>
							))}
						</List>
					</Paper>
				)}
			</Stack>

			<Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)}>
				<DialogTitle>添加新标签</DialogTitle>
				<DialogContent>
					<TextField
						fullWidth
						label="标签名称"
						value={newLabelName}
						onChange={(e) => setNewLabelName(e.target.value)}
						margin="normal"
					/>
					<TextField
						fullWidth
						label="颜色代码"
						value={newLabelColor}
						onChange={(e) => setNewLabelColor(e.target.value)}
						margin="normal"
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">#</InputAdornment>
							),
						}}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setIsDialogOpen(false)}>取消</Button>
					<Button onClick={handleAddLabel} variant="contained">
						添加
					</Button>
				</DialogActions>
			</Dialog>
		</Container>
	);
}

export default App;
