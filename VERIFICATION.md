# ✅ Mesna POS Deployment Verification Checklist

Use this checklist to verify your Mesna POS deployment is working correctly across all machines.

## 🚀 Initial Setup Verification

### On EACH Machine:
- [ ] **Folder Structure**: `C:\MesnaPOS\` (or chosen location) contains:
  - `backend\` folder with `server.js`, `package.json`, `prisma\`
  - `frontend\` folder with `src\`, `package.json`, `vite.config.js`
  - `start-pos.bat`
  - `DEPLOY_GUIDE.md`

- [ ] **Dependencies Installed**:
  - Backend: `node_modules\` folder exists in `backend\`
  - Frontend: `node_modules\` folder exists in `frontend\`

- [ ] **Environment Configuration**:
  - `backend\.env` exists (copy from `.env.example` if needed)
  - Contains at least: `DATABASE_URL="file:./data/pos.db"` and `PORT=3001`

- [ ] **Database Initialized**:
  - `backend\data\pos.db` file exists and is > 1MB
  - Can be opened with SQLite viewer to show tables: `User`, `Product`, `Order`, `OrderItem`

### Backend Verification:
- [ ] **Server Starts**: Running `start-pos.bat` shows:
  - `[P2P Mesh] Starting on [IP]:[PORT] ([NAME])`
  - `🚀 Mesna POS Backend running on http://localhost:[PORT]`
  - `[P2P Mesh UDP] Listening for peers on port 41234...`

- [ ] **API Endpoints Respond**:
  - `http://localhost:3001/api/health` returns `{"status":"ok"}`
  - `http://localhost:3001/api/products` returns array of products
  - `http://localhost:3001/api/admin/users` returns 401 (expected - needs auth)

### Frontend Verification:
- [ ] **UI Loads**: `http://localhost:5173` shows:
  - Login screen with title "Mesna POS"
  - Username/PIN fields
  - Language selector (EN/UR/HI)
  - "Forgot PIN?" link

- [ ] **Login Works**:
  - Admin: PIN `1234` → Redirects to dashboard
  - Cashier: PIN `0000` → Redirects to POS interface
  - Invalid PIN shows error message

## 🔄 Multi-Machine Sync Verification

### Preparation:
- [ ] All machines on same LAN/Wi-Fi network
- [ ] Windows Firewall allows:
  - UDP port 41234 (inbound/outbound)
  - TCP port 3001 (inbound)
  - TCP port 5173 (inbound) - for dev mode
  - TCP port 4173 (inbound) - for production preview

### Sync Tests:
- [ ] **Discovery Test**:
  - On Machine A: Check backend logs for `[P2P Mesh] Discovered peer:` when Machine B starts
  - On Machine B: Same when Machine A starts
  - Should see peer names like `Register-3001`, `Register-3002`, etc.

- [ ] **Product Sync Test**:
  1. On Machine A: Login as admin, go to Products → Add New Product
  2. Enter: Name: "Test Sync Product", SKU: "TEST001", Price: 9.99, Stock: 10
  3. Save product
  4. On Machine B: Wait 5-10 seconds, refresh product list
  5. [ ] Product "Test Sync Product" appears with correct details

- [ ] **Inventory Sync Test**:
  1. On Machine A: Login as cashier, add "Test Sync Product" to cart (quantity 2)
  2. Complete checkout (any payment method)
  3. On Machine B: Wait 5-10 seconds, check:
     - [ ] Product stock decreased by 2 (from 10 to 8)
     - [ ] New transaction appears in Admin → Transactions
     - [ ] Revenue updated in dashboard

- [ ] **Voice Command Test** (Optional but recommended):
  1. On any machine: Click microphone icon in POS interface
  2. Allow microphone access when prompted
  3. Say clearly: "Add Milk"
  4. [ ] "Milk" appears in cart
  5. Say: "Bill banao"
  6. [ ] Checkout screen appears
  7. Say: "Das percent discount 10"
  8. [ ] 10% discount applied
  9. Say: "Payment card"
  10. [ ] Sale completes successfully

## 📊 Production Readiness Checks

### Performance:
- [ ] **Response Time**: UI actions respond within 2 seconds
- [ ] **Sync Latency**: Changes appear on other machines within 5 seconds
- [ ] **Memory Usage**: Node.js process uses < 1.5GB RAM (check Task Manager)
- [ ] **CPU Usage**: Idle < 10%, active operations < 50%

### Reliability:
- [ ] **Offline Test**: 
  - Disconnect machine from internet
  - [ ] POS still works (local sales, product browsing)
  - [ ] Voice commands still work (after initial model load)
  - [ ] Reconnect internet: [ ] P2P sync resumes automatically

- [ ] **Fault Tolerance Test**:
  - Machine A: Make a sale
  - Machine B: Shut down backend during sale processing
  - Machine B: Start backend after 10 seconds
  - [ ] Machine B catches up and shows the sale

### Security:
- [ ] **Default PINs Changed**: 
  - Admin PIN changed from `1234` on at least one machine
  - Cashier PIN changed from `0000` on at least one machine
  - [ ] Document new PINs in secure location

- [ ] **Access Controls**:
  - Cashier login cannot access Admin panel
  - Admin login can access all features
  - [ ] Attempt to access `/api/admin/*` without auth returns 401/403

### Backup & Recovery:
- [ ] **Backup System**:
  - Manual backup works: `cd backend && node scripts/backup.js`
  - [ ] Backup file created in `backend\backups\` directory
  - [ ] Backup file is valid SQLite database

- [ ] **Restore Test** (Optional - do on test machine only):
  - Copy backup to `backend\data\pos.db` (stop backend first)
  - [ ] System starts and shows backed-up data

## 📋 Final Sign-Off

### Machine-by-Machine Checklist:
For each of your 10+ machines, verify:
- [ ] Machine #1: [_] All checks passed
- [ ] Machine #2: [_] All checks passed  
- [ ] Machine #3: [_] All checks passed
- [ ] Machine #4: [_] All checks passed
- [ ] Machine #5: [_] All checks passed
- [ ] Machine #6: [_] All checks passed
- [ ] Machine #7: [_] All checks passed
- [ ] Machine #8: [_] All checks passed
- [ ] Machine #9: [_] All checks passed
- [ ] Machine #10: [_] All checks passed

### Overall System Health:
- [ ] **Network**: All machines can ping each other by IP
- [ ] **Time Sync**: All machines synchronized to same time source (Windows auto-sync OK)
- [ ] **Licensing**: Any required software (Windows, etc.) properly licensed
- [ ] **Documentation**: Login credentials and procedures documented securely
- [ ] **Training**: Cashiers trained on basic operations (add item, voice commands, checkout)
- [ ] **Support**: Know who to contact for issues (name, phone, escalation path)

## 📞 Troubleshooting Quick Reference

### Common Issues & Fixes:
| Symptom | Likely Cause | Solution |
|---------|--------------|----------|
| Machines not finding each other | UDP 41234 blocked | Windows Firewall: Allow UDP 41234 |
| Backend won't start | Port 3001 in use | Change PORT in .env or stop conflicting service |
| Frontend blank page | Build not run | Run `npm run build` in frontend |
| Voice commands not working | Mic not allowed | Click lock icon in browser address bar → Allow microphone |
| Database locked | Antivirus scanning pos.db | Add exclusion for `backend\data\pos.db` |
| Slow performance | Low RAM/Virtual memory | Increase page file size or add RAM |
| Sync delays >10 sec | Network congestion | Use wired Ethernet, check for bandwidth hogs |

### Log Locations:
- Backend logs: `backend\logs\pos.log`
- Frontend logs: Browser DevTools → Console
- Windows Events: Event Viewer → Windows Logs → Application

### Emergency Procedures:
1. **POS Down**: Restart `start-pos.bat` on affected machine
2. **Database Corrupted**: Restore from latest backup in `backend\backups\`
3. **Network Partition**: Machines will sync automatically when network restored
4. **Forgot PIN**: Reset via database: `UPDATE user SET pin_hash = '$2b$10$...' WHERE id = 1`

## 🎉 Deployment Complete!

When all checks pass across all machines, your Mesna POS deployment is:
- ✅ **Production Ready**: Handles daily retail operations
- ✅ **Fault Tolerant**: No single point of failure  
- ✅ **Secure**: Proper access controls and data protection
- ✅ **Supportable**: Clear procedures for issues and recovery
- ✅ **Scalable**: Ready to add more registers as needed

**Next Steps:**
1. Train all cashiers on basic operations
2. Post quick-reference guides at each register
3. Schedule weekly backup verification
4. Monthly: Check for updates and retrain staff
5. Quarterly: Full system test and disaster recovery drill

Your Mesna POS system is now ready to serve your business reliably!