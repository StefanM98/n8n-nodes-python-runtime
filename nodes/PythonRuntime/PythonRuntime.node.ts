import { 
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class PythonRuntime implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Python Runtime',
		name: 'pythonRuntime',
		icon: 'file:python.svg',
		group: ['transform'],
		version: 1,
		description: 'Execute Python scripts using system Python runtime',
		defaults: {
			name: 'Python Runtime',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionType.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Execute Script',
						value: 'executeScript',
						description: 'Execute Python code directly',
						action: 'Execute python code directly',
					},
					{
						name: 'Run File',
						value: 'runFile',
						description: 'Run a Python file',
						action: 'Run a python file',
					},
				],
				default: 'executeScript',
				noDataExpression: true,
				required: true,
			},
			{
				displayName: 'Python Code',
				name: 'pythonCode',
				type: 'string',
				typeOptions: {
					rows: 8,
				},
				displayOptions: {
					show: {
						operation: ['executeScript'],
					},
				},
				default: 'print("Hello from Python!")',
				description: 'The Python code to execute',
				required: true,
			},
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['runFile'],
					},
				},
				default: '',
				placeholder: '/path/to/script.py',
				description: 'Path to the Python script file to execute',
				required: true,
			},
			{
				displayName: 'Command Arguments',
				name: 'commandArguments',
				type: 'string',
				default: '',
				description: 'Arguments to pass to the Python script',
			},
			{
				displayName: 'Python Path',
				name: 'pythonPath',
				type: 'string',
				default: 'python3',
				description: 'Path to Python executable (defaults to python3)',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const pythonPath = this.getNodeParameter('pythonPath', i, 'python3') as string;
				const commandArguments = this.getNodeParameter('commandArguments', i, '') as string;

				let command: string;
				if (operation === 'executeScript') {
					const pythonCode = this.getNodeParameter('pythonCode', i) as string;
					// Escape single quotes in the Python code
					const escapedCode = pythonCode.replace(/'/g, "'\\''");
					command = `${pythonPath} -c '${escapedCode}'`;
				} else {
					const filePath = this.getNodeParameter('filePath', i) as string;
					command = `${pythonPath} "${filePath}"`;
				}

				if (commandArguments) {
					command += ` ${commandArguments}`;
				}

				const { stdout, stderr } = await execAsync(command);

				returnData.push({
					json: {
						stdout: stdout.trim(),
						stderr: stderr.trim(),
						success: true,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							success: false,
							error: error.message,
							stdout: error.stdout?.trim() || '',
							stderr: error.stderr?.trim() || '',
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
} 