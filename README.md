# ISC DHCP Server Web Management UI

ระบบบริหารจัดการ **ISC DHCP Server (`isc-dhcp-server`)** ผ่าน Web Application สไตล์ Modern Glassmorphism พัฒนาด้วย **Node.js (Express API) + React (Vite)** พร้อม Vanilla CSS Design System

---

## 🌟 จุดเด่นและฟังก์ชันการทำงาน

- 📊 **Dashboard ภาพรวม**:
  - แสดงสถานะการทำงานของ DHCP daemon (`active`, `PID`, `uptime`)
  - สรุปจำนวน Subnets, Static Hosts, Active Leases และ Total Pool Capacity
  - กราฟและแถบแสดงอัตราการใช้งาน Address Pool (%) ในแต่ละ Subnet แบบ Real-time
  - ควบคุม Service ได้ทันที (Restart, Reload, Stop, Start)
- 🔐 **Authentication & Security (Admin Only)**:
  - ระบบตรวจสอบสิทธิ์ด้วย JWT Token
  - รองรับเฉพาะผู้ดูแลระบบระดับ **Admin** เท่านั้น
  - บัญชีเริ่มต้น: `admin` / รหัสผ่าน: `admin123`
- 🌐 **Subnet Management**:
  - จัดการ Network, Netmask, Dynamic Pool Range (`start` - `end`)
  - ตั้งค่า Default Gateway (option routers), DNS Servers, Domain Name และ Lease Time
- 📌 **Static IP (Host Reservations)**:
  - จัดการผูก MAC Address กับ IP Address ถาวร (`hardware ethernet` & `fixed-address`)
  - ตรวจสอบรูปแบบ MAC Address (`XX:XX:XX:XX:XX:XX`) และป้องกันการจอง IP ชนกัน
  - ปุ่ม 1-Click Copy MAC/IP
- 📡 **Lease IP Viewer**:
  - อ่านและประมวลผล `/var/lib/dhcp/dhcpd.leases` แบบ Real-time
  - กรองสถานะ Active / Free / Expired
  - ค้นหาด้วย IP, MAC หรือ Client Hostname
  - คำนวณเวลานับถอยหลังหมดอายุของแต่ละ Lease
  - ส่งออกข้อมูลเป็นไฟล์ CSV
  - รองรับการ Release / ปลดปล่อย IP ที่แจกออกไป
- 📝 **dhcpd.conf Editor & Safety**:
  - หน้าแก้ไขไฟล์คอนฟิกโดยตรง
  - ระบบ **Test Syntax** ตรวจสอบไวยากรณ์ก่อนบันทึก
  - **Auto-Backup & Snapshot History**: สำรองข้อมูลอัตโนมัติทุกครั้งก่อนบันทึก และสามารถ Rollback ย้อนกลับได้ด้วยคลิกเดียว
- 🖥️ **Service Control & Logs**:
  - ดู Systemd Journal logs ของ DHCP server แบบสด
  - ตัวกรองข้อความ Log เช่น `DHCPACK`, `DHCPOFFER`, `DHCPDISCOVER`
- 💻 **Dual-Environment Support**:
  - **Linux Host**: ทำงานกับไฟล์ระบบจริง `/etc/dhcp/dhcpd.conf` และคำสั่ง `systemctl`
  - **Windows / Dev**: เข้าสู่ **Mock Mode** อัตโนมัติ พร้อมข้อมูลจำลองเสมือนจริงสำหรับพัฒนาและทดสอบได้ทันที

---

## 🚀 วิธีการติดตั้งและรันใช้งาน

### 1. ทดสอบรันบนเครื่อง Local / Windows (Mock Mode)

```bash
# 1. ติดตั้ง Dependencies ทั้งหมด (Root, Server, Client)
npm run install:all

# 2. รันโหมด Development (เปิดทั้ง API และ Frontend พร้อมกัน)
npm run dev
```

- เข้าใช้งานหน้าเว็บได้ที่: **`http://localhost:3000`**
- Backend API รันอยู่ที่: **`http://localhost:5000`**
- เข้าสู่ระบบด้วย:
  - **Username**: `admin`
  - **Password**: `admin123`

---

### 2. นำไปติดตั้งบน Linux Server (Production Setup)

#### ขั้นตอนที่ 1: ติดตั้ง Node.js (v18+) และ ISC DHCP Server
```bash
sudo apt update
sudo apt install -y isc-dhcp-server nodejs npm git
```

#### ขั้นตอนที่ 2: Clone และติดตั้งโปรเจกต์
```bash
sudo git clone <your-repo-url> /opt/isc-dhcp-ui
cd /opt/isc-dhcp-ui
sudo npm run install:all
sudo npm run build
```

#### ขั้นตอนที่ 3: ตั้งค่าสิทธิ์ Sudoers ให้กับ Service Control
เพื่อให้ Node.js สามารถสั่ง restart หรือ reload `isc-dhcp-server` ได้โดยไม่ต้องใช้รหัสผ่าน root:
```bash
sudo visudo -f /etc/sudoers.d/dhcp-webui
```
ใส่บรรทัดนี้ลงไป (แทนที่ `<user>` ด้วย user ที่รัน node เช่น `www-data` หรือ user ของคุณ):
```sudoers
<user> ALL=(ALL) NOPASSWD: /bin/systemctl restart isc-dhcp-server, /bin/systemctl reload isc-dhcp-server, /bin/systemctl status isc-dhcp-server, /bin/systemctl stop isc-dhcp-server, /bin/systemctl start isc-dhcp-server, /usr/sbin/dhcpd -t *
```

และกำหนดสิทธิ์ให้ user สามารถอ่าน/เขียน `/etc/dhcp/dhcpd.conf` และอ่าน `/var/lib/dhcp/dhcpd.leases`:
```bash
sudo chown -R root:<user> /etc/dhcp
sudo chmod -R 775 /etc/dhcp
```

#### ขั้นตอนที่ 4: ตั้งค่ารันเป็น Systemd Service
สร้างไฟล์ `/etc/systemd/system/isc-dhcp-ui.service`:
```ini
[Unit]
Description=ISC DHCP Server Web UI Management
After=network.target isc-dhcp-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/isc-dhcp-ui
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=DHCP_MODE=real
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

เปิดใช้งาน Service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now isc-dhcp-ui
```

เข้าถึงหน้าเว็บได้ผ่าน: **`http://<server-ip>:5000`**

---

## 🛠️ โครงสร้างโปรเจกต์

```
d:/code/isc-dhcp-ui/
├── package.json              # Monorepo coordination
├── server/                   # Express Backend
│   ├── config/default.js     # ตรวจจับ Real/Mock mode และพาธไฟล์
│   ├── middleware/auth.js    # JWT & Admin role verification
│   ├── services/
│   │   ├── dhcpConfigService.js  # ตัวแยกวิเคราะห์และสร้าง dhcpd.conf
│   │   ├── dhcpLeaseService.js   # ตัวอ่านและวิเคราะห์ dhcpd.leases
│   │   ├── systemService.js      # จัดการคำสั่ง systemctl & journalctl
│   │   ├── authService.js        # ตรวจสอบรหัสผ่าน & สร้าง Token
│   │   └── backupService.js      # จัดการประวัติ Snapshot & Rollback
│   ├── routes/               # REST API Endpoints
│   └── mock/                 # Mock Data จำลอง
└── client/                   # React (Vite) Frontend
    ├── src/
    │   ├── index.css         # Modern Vanilla CSS (Glassmorphism & Variables)
    │   ├── context/          # Auth Context
    │   ├── components/       # Navbar, Sidebar, MetricCard, Modal
    │   └── pages/            # Dashboard, Subnets, StaticIP, Leases, Config, Service
```
