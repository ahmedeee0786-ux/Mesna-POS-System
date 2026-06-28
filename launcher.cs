using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;
using System.Drawing;
using System.Net;

namespace MesnaPOS
{
    public class LauncherApp : Form
    {
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;
        private Process nodeProcess;
        private string port = "3001";
        private string appDir;

        [STAThread]
        public static void Main()
        {
            try
            {
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new LauncherApp());
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "A fatal error occurred during launcher startup:\n\n" + ex.Message + "\n\n" + ex.StackTrace,
                    "Mesna POS Launcher Fatal Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }

        public LauncherApp()
        {
            // Configure window to run invisible in the background
            this.WindowState = FormWindowState.Minimized;
            this.ShowInTaskbar = false;
            this.Visible = false;
            this.FormBorderStyle = FormBorderStyle.None;
            this.Width = 0;
            this.Height = 0;

            appDir = Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location);
            
            // 1. Perform Pre-checks
            if (!PerformPreChecks())
            {
                Application.Exit();
                return;
            }

            // Check port variable in configuration
            LoadPortFromEnv();

            // Run first time migrations if DB files do not exist
            SetupDatabaseIfNeeded();

            // Setup System Tray context menu options
            trayMenu = new ContextMenu();
            trayMenu.MenuItems.Add("Open POS (Browser)", OpenBrowser);
            trayMenu.MenuItems.Add("-");
            trayMenu.MenuItems.Add("Exit Mesna POS", ExitApp);

            // Configure Tray Icon details
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Mesna POS (Starting...)";
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.ContextMenu = trayMenu;
            trayIcon.Visible = true;

            // Start backend Node server process
            StartNodeServer();

            // Monitor backend server startup in a background thread
            StartServerMonitor();
        }

        private bool PerformPreChecks()
        {
            // Check if backend directory exists and contains server.js
            string serverPath = Path.Combine(appDir, "backend\\server.js");
            if (!File.Exists(serverPath))
            {
                MessageBox.Show(
                    "Mesna POS Files Missing!\n\n" +
                    "The launcher could not find 'backend\\server.js'.\n\n" +
                    "Please ensure you have:\n" +
                    "1. Extracted the ENTIRE deployment ZIP file (do not run directly from the ZIP folder).\n" +
                    "2. Placed MesnaPOS.exe in the same folder that contains the 'backend' and 'frontend' directories.",
                    "Mesna POS Launcher Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }

            // Check if node_modules exists
            string nodeModulesPath = Path.Combine(appDir, "backend\\node_modules");
            if (!Directory.Exists(nodeModulesPath))
            {
                MessageBox.Show(
                    "Dependencies Missing!\n\n" +
                    "The 'node_modules' folder was not found inside the backend directory.\n\n" +
                    "Please run the setup script 'setup-register.bat' (as Administrator) or 'npm install' in the backend directory first to install the required files.",
                    "Mesna POS Launcher Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }

            // Check for Node.js installation
            string localNode = Path.Combine(appDir, "node-runtime\\node.exe");
            bool hasLocalNode = File.Exists(localNode);
            bool hasGlobalNode = false;

            if (!hasLocalNode)
            {
                try
                {
                    ProcessStartInfo checkInfo = new ProcessStartInfo();
                    checkInfo.FileName = "node";
                    checkInfo.Arguments = "-v";
                    checkInfo.CreateNoWindow = true;
                    checkInfo.UseShellExecute = false;
                    using (Process p = Process.Start(checkInfo))
                    {
                        p.WaitForExit(1000);
                        hasGlobalNode = true;
                    }
                }
                catch
                {
                    hasGlobalNode = false;
                }
            }

            if (!hasLocalNode && !hasGlobalNode)
            {
                MessageBox.Show(
                    "Node.js Runtime Missing!\n\n" +
                    "Mesna POS requires Node.js to run.\n\n" +
                    "Please download and install Node.js (v18 or higher) from: https://nodejs.org/\n" +
                    "Alternatively, ensure you have setup a local runtime folder: 'node-runtime\\node.exe'.",
                    "Mesna POS Launcher Error",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return false;
            }

            return true;
        }

        private void LoadPortFromEnv()
        {
            try
            {
                string envPath = Path.Combine(appDir, "backend\\.env");
                if (File.Exists(envPath))
                {
                    string[] lines = File.ReadAllLines(envPath);
                    foreach (string line in lines)
                    {
                        if (line.Trim().StartsWith("PORT="))
                        {
                            port = line.Split('=')[1].Trim().Trim('"').Trim('\'');
                            break;
                        }
                    }
                }
            }
            catch {}
        }

        private void SetupDatabaseIfNeeded()
        {
            try
            {
                string dataDir = Path.Combine(appDir, "backend\\data");
                if (!Directory.Exists(dataDir))
                {
                    Directory.CreateDirectory(dataDir);
                }

                string dbPath = Path.Combine(dataDir, "pos.db");
                string templatePath = Path.Combine(dataDir, "pos.db.template");

                if (!File.Exists(dbPath) && File.Exists(templatePath))
                {
                    File.Copy(templatePath, dbPath);
                    AppendLog("[SETUP] Database pos.db created from template.");
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to restore database: " + ex.Message, "Setup Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void StartNodeServer()
        {
            try
            {
                ProcessStartInfo nodeInfo = new ProcessStartInfo();
                nodeInfo.FileName = "node.exe"; // Fallback to global node installation
                
                // If pre-packaged node executable is in directory, run it locally
                string localNode = Path.Combine(appDir, "node-runtime\\node.exe");
                if (File.Exists(localNode))
                {
                    nodeInfo.FileName = localNode;
                }

                nodeInfo.Arguments = "server.js";
                nodeInfo.WorkingDirectory = Path.Combine(appDir, "backend");
                nodeInfo.CreateNoWindow = true; // Run hidden from taskbar/desktop screen
                nodeInfo.UseShellExecute = false;
                
                // Redirect standard output and error to capture logs
                nodeInfo.RedirectStandardOutput = true;
                nodeInfo.RedirectStandardError = true;

                AppendLog("[LAUNCHER] Spawning backend server node process...");
                nodeProcess = new Process();
                nodeProcess.StartInfo = nodeInfo;
                nodeProcess.EnableRaisingEvents = true;

                // Event handlers to stream server logs to file
                nodeProcess.OutputDataReceived += (s, e) => {
                    if (e.Data != null) AppendLog(e.Data);
                };
                nodeProcess.ErrorDataReceived += (s, e) => {
                    if (e.Data != null) AppendLog("[ERROR] " + e.Data);
                };

                nodeProcess.Start();

                // Begin reading output stream
                nodeProcess.BeginOutputReadLine();
                nodeProcess.BeginErrorReadLine();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not start Mesna POS backend server.\nEnsure Node.js is installed or node.exe is in the path.\nError: " + ex.Message, "Server Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                Application.Exit();
            }
        }

        private void StartServerMonitor()
        {
            System.Threading.Thread checkThread = new System.Threading.Thread(() => {
                string healthUrl = "http://localhost:" + port + "/api/health";
                bool isHealthy = false;
                
                // Poll health endpoint for up to 15 seconds
                for (int i = 0; i < 15; i++)
                {
                    if (nodeProcess == null || nodeProcess.HasExited)
                    {
                        AppendLog("[LAUNCHER] Node.js process exited prematurely.");
                        break;
                    }

                    if (CheckServerHealth(healthUrl))
                    {
                        isHealthy = true;
                        break;
                    }
                    System.Threading.Thread.Sleep(1000);
                }

                if (isHealthy)
                {
                    AppendLog("[LAUNCHER] Backend server verified healthy. Opening POS in default browser.");
                    
                    // Update tray details and open browser on UI Thread
                    this.BeginInvoke((MethodInvoker)delegate {
                        trayIcon.Text = "Mesna POS (Running)";
                        trayIcon.ShowBalloonTip(3000, "Mesna POS Active", "POS system is active and running in the background.", ToolTipIcon.Info);
                        OpenBrowser(null, null);
                    });
                }
                else
                {
                    AppendLog("[LAUNCHER] Backend server failed to respond to health checks.");
                    
                    this.BeginInvoke((MethodInvoker)delegate {
                        string logPath = Path.Combine(appDir, "backend\\logs\\pos.log");
                        DialogResult result = MessageBox.Show(
                            "The Mesna POS backend server started, but is not responding on port " + port + ".\n\n" +
                            "This can occur if the database is locked, or if the port is already in use.\n" +
                            "Would you like to open the server logs to troubleshoot?",
                            "Mesna POS Launch Failure",
                            MessageBoxButtons.YesNo,
                            MessageBoxIcon.Error
                        );
                        if (result == DialogResult.Yes)
                        {
                            // Resolve the log path from appDir — never from user/peer input
                            string logsDir = Path.GetFullPath(Path.Combine(appDir, "backend\\logs"));
                            string resolvedLog = Path.GetFullPath(Path.Combine(logsDir, "pos.log"));
                            
                            // Ensure the resolved path stays inside the expected logs directory
                            if (resolvedLog.StartsWith(logsDir, StringComparison.OrdinalIgnoreCase) && File.Exists(resolvedLog))
                            {
                                try { Process.Start("notepad.exe", resolvedLog); }
                                catch {}
                            }
                        }
                        ExitApp(null, null);
                    });
                }
            });

            checkThread.IsBackground = true;
            checkThread.Start();
        }

        private bool CheckServerHealth(string url)
        {
            try
            {
                var request = (HttpWebRequest)WebRequest.Create(url);
                request.Timeout = 1000;
                using (var response = (HttpWebResponse)request.GetResponse())
                {
                    return response.StatusCode == HttpStatusCode.OK;
                }
            }
            catch
            {
                return false;
            }
        }

        private void AppendLog(string message)
        {
            try
            {
                string logsDir = Path.Combine(appDir, "backend\\logs");
                if (!Directory.Exists(logsDir))
                {
                    Directory.CreateDirectory(logsDir);
                }
                string logPath = Path.Combine(logsDir, "pos.log");
                
                // Write cleanly formatted log entries
                string logLine = string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}\r\n", DateTime.Now, message);
                File.AppendAllText(logPath, logLine);
            }
            catch {}
        }

        private void OpenBrowser(object sender, EventArgs e)
        {
            try
            {
                Process.Start("http://localhost:" + port);
            }
            catch
            {
                MessageBox.Show("Failed to open browser automatically. Please open http://localhost:" + port + " manually.", "Info", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }

        private void ExitApp(object sender, EventArgs e)
        {
            try
            {
                if (nodeProcess != null && !nodeProcess.HasExited)
                {
                    nodeProcess.Kill();
                }
            }
            catch {}

            if (trayIcon != null)
            {
                trayIcon.Visible = false;
            }
            Application.Exit();
        }

        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            this.Hide(); // Ensure form does not render visually on startup
        }
    }
}
