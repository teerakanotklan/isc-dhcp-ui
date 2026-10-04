# ISC DHCP Server Web Management UI

ระบบบริหารจัดการ **ISC DHCP Server** ผ่าน Web Application สไตล์ Modern Glassmorphism พัฒนาด้วย **Node.js (Express API) + React (Vite)** พร้อมสถาปัตยกรรม Single-Port ให้บริการไฟล์ Production Bundle ได้ทันที

รองรับการควบคุมและจัดการ DHCP Server บน **Linux Server** โดยตรงผ่านคำสั่งมาตรฐาน `systemctl`, `journalctl`, และไวยากรณ์ `dhcpd`

---

## 🌟 จุดเด่นและฟังก์ชันการทำงาน

- 📊 **Dashboard ภาพรวม Real-time**:
  - แสดงสถานะการทำงานจริงของ DHCP daemon (`active`, `PID`, `uptime`) ผ่าน `systemctl`
  - สรุปจำนวน Subnets, Static Hosts, Active Leases และ Pool Capacity
  - กราฟและแถบแสดงอัตราการใช้งาน Address Pool (%) ในแต่ละ Subnet
  - ควบคุม Service ได้ทันที (Restart, Reload, Stop, Start)
- 🔐 **Authentication & Security (Admin Role)**:
  - ระบบตรวจสอบสิทธิ์ด้วย JWT Token (HMAC-SHA256)
  - บัญชีเริ่มต้น: `admin` / รหัสผ่าน: `admin123`
- 🌐 **Subnet & Scope Management**:
  - จัดการ Network, Netmask, Dynamic Pool Range (`range start end`)
  - กำหนด Default Gateway (`routers`), DNS Servers, Domain Name, และ Custom DHCP Options (เช่น NTP, PXE bootfile-name, MTU)
- 📌 **Static IP (Host Reservations)**:
  - จัดการผูก MAC Address กับ IP Address ถาวร (`hardware ethernet` & `fixed-address`)
  - ตรวจสอบรูปแบบ MAC Address และป้องกันการจอง IP ชนกัน
- 📡 **Lease IP Viewer**:
  - อ่านและประมวลผลไฟล์ Leases จริงของระบบ (`dhcpd.leases`)
  - ค้นหาและกรองสถานะ Active / Free / Expired
  - ส่งออกข้อมูลเป็นไฟล์ CSV
- 📝 **Configuration & Safety**:
  - จัดการ Listen Network Interfaces (`INTERFACESv4` / `INTERFACESv6`)
  - ตรวจสอบความถูกต้องของไฟล์ไวยากรณ์ด้วย `dhcpd -t`
  - ระบบ Auto-Backup สำรองไฟล์ `/etc/dhcp/dhcpd.conf` อัตโนมัติทุกครั้งก่อนบันทึก
- 📜 **Service Logs**:
  - ดึงข้อมูลบันทึกสดผ่าน `journalctl -u <service>` พร้อมระบบกรองข้อความและ Auto-poll

---

## 🐧 การติดตั้งอัตโนมัติบน Linux Server (Automated Installer)

โปรเจกต์มีสคริปต์ `install.sh` สำหรับติดตั้งแบบอัตโนมัติครบวงจร โดยจะตรวจสอบ OS, ติดตั้งแพ็กเกจที่เกี่ยวข้อง, สร้าง Dedicated User (`dhcpui`), กำหนดสิทธิ์ Sudoers, Build Frontend และเปิดใช้งาน Systemd Service ให้อัตโนมัติ

### ระบบปฏิบัติการที่รองรับ:
- **Debian Family**: Debian 10 / 11 / 12, Ubuntu 20.04 / 22.04 / 24.04 LTS (แพ็กเกจ `isc-dhcp-server`)
- **Enterprise Linux (RHEL Family)**: Rocky Linux 8 / 9, AlmaLinux 8 / 9, RHEL 8 / 9, CentOS Stream, Fedora (แพ็กเกจ `dhcp-server`)

### ขั้นตอนการติดตั้ง:

```bash
# 1. Clone โปรเจกต์ไปยังเซิร์ฟเวอร์
git clone <repository-url> /opt/isc-dhcp-ui
cd /opt/isc-dhcp-ui

# 2. รันสคริปต์ติดตั้งด้วยสิทธิ์ root
sudo bash install.sh
```

### สคริปต์ `install.sh` จะดำเนินการสิ่งต่อไปนี้ให้อัตโนมัติ:
1. ตรวจจับ Linux Distribution และเลือกใช้ Package Manager (`apt` หรือ `dnf`/`yum`)
2. ติดตั้งแพ็กเกจระบบที่จำเป็น: `isc-dhcp-server` (หรือ `dhcp-server`), `git`, `curl`, `net-tools`
3. ติดตั้ง Node.js 20 LTS จาก NodeSource หากระบบยังไม่มี
4. สร้าง System User เฉพาะ `dhcpui` เพื่อความปลอดภัยในการทำงาน
5. ตั้งค่าสิทธิ์ `/etc/sudoers.d/isc-dhcp-ui` เพื่อให้ `dhcpui` สั่งการเฉพาะคำสั่ง lifecycle ของ DHCP service
6. สำรองไฟล์ `/etc/dhcp/dhcpd.conf` และสร้างเทมเพลตเริ่มต้นหากไฟล์ยังไม่มี
7. ติดตั้ง Node dependencies และคอมไพล์ Frontend Production Bundle (`npm run build`)
8. สร้างและเปิดใช้งาน Systemd Unit: `isc-dhcp-ui.service` ที่พอร์ต `3000`

---

## 🌐 การเข้าใช้งานระบบ

เมื่อติดตั้งสำเร็จ สามารถเปิดเว็บบราวเซอร์และเข้าไปที่:
- **URL**: `http://<IP-ของเซิร์ฟเวอร์>:3000` (หรือ `http://localhost:3000`)
- **Username**: `admin`
- **Password**: `admin123`

---

## 🔧 คำสั่งจัดการ Service บน Linux

```bash
# ตรวจสอบสถานะ Web UI
sudo systemctl status isc-dhcp-ui

# Restart Web UI
sudo systemctl restart isc-dhcp-ui

# ตรวจสอบสถานะ DHCP Server Daemon
# สำหรับ Ubuntu / Debian:
sudo systemctl status isc-dhcp-server
# สำหรับ RHEL / Rocky Linux:
sudo systemctl status dhcpd

# ตรวจสอบ Logs
sudo journalctl -u isc-dhcp-ui -f
```

---

## 🛠️ โครงสร้างโปรเจกต์

```
isc-dhcp-ui/
├── install.sh                # สคริปต์ติดตั้งอัตโนมัติบน Linux Server
├── package.json              # Monorepo scripts
├── server/                   # Express Backend Service
│   ├── config/default.js     # ตรวจจับระบบปฏิบัติการ (Debian vs RHEL) และกำหนดพาธไฟล์ระบบ
│   ├── index.js              # Server entry point & Production Static Asset Serving
│   ├── middleware/auth.js    # JWT Authentication & Authorization
│   ├── services/
│   │   ├── dhcpConfigService.js  # ตัวแยกวิเคราะห์และสร้าง dhcpd.conf
│   │   ├── dhcpLeaseService.js   # ตัวอ่านและวิเคราะห์ dhcpd.leases
│   │   ├── systemService.js      # จัดการคำสั่ง systemctl & journalctl ของระบบจริง
│   │   ├── authService.js        # ตรวจสอบรหัสผ่าน & จัดการบัญชี Admin
│   │   └── backupService.js      # จัดการประวัติ Snapshot & Rollback
│   └── routes/               # REST API Endpoints
└── client/                   # React (Vite) Frontend
    ├── src/
    │   ├── index.css         # Modern Vanilla CSS (Glassmorphism Design System)
    │   ├── context/          # Auth Context
    │   ├── components/       # Navbar, Sidebar, MetricCard, ConfirmModal
    │   └── pages/            # Dashboard, Scopes, Static Hosts, Leases, Settings, ServiceLogs
```
