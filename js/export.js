// Excel Export Utility - Optimized for Stability and Professionalism
const ExportUtils = {
    exportToExcel: function(allocation) {
        if (!window.XLSX) {
            alert('SheetJS library is not loaded. Cannot export to Excel.');
            return;
        }

        if (!allocation || !allocation.rooms || allocation.rooms.length === 0) {
            alert('No detailed room matrix available for this allocation.');
            return;
        }

        const wb = XLSX.utils.book_new();

        // Common Styles using xlsx-js-style
        const centerStyle = { alignment: { horizontal: "center", vertical: "center" } };
        const borderStyle = {
            border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            },
            alignment: { horizontal: "center", vertical: "center" }
        };
        const boldBorderStyle = { font: { bold: true }, border: borderStyle.border, alignment: centerStyle.alignment };
        const rightAlign = { alignment: { horizontal: "right", vertical: "center" } };

        allocation.rooms.forEach((room, index) => {
            const sheetName = (room.roomName || `Room-${index+1}`).replace(/[^a-zA-Z0-9 ]/g, '').substring(0, 31);
            const wsData = [];
            
            // Helper to generate a blank row object array to avoid shared references
            const createBlankRow = (cols) => Array.from({ length: cols }, () => ({ v: '', s: {} }));

            // 1. Headers
            const totalCols = (room.cols || 6) + 1;
            
            const mainHeader = createBlankRow(totalCols);
            mainHeader[0] = { v: 'JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY HYDERABAD', s: { font: { bold: true, sz: 12 }, alignment: centerStyle.alignment } };
            wsData.push(mainHeader);

            const subHeader = createBlankRow(totalCols);
            subHeader[0] = { v: 'UNIVERSITY COLLEGE OF ENGINEERING WANAPARTHY', s: { font: { bold: true, sz: 11 }, alignment: centerStyle.alignment } };
            wsData.push(subHeader);

            const addrHeader = createBlankRow(totalCols);
            addrHeader[0] = { v: 'Narsingapalli, Gopalpet Road, Wanaparthy Dist., Telangana State - 509103', s: { font: { bold: true, sz: 10 }, alignment: centerStyle.alignment } };
            wsData.push(addrHeader);
            
            const session = allocation.session || 'FN';
            const dateStr = allocation.examDate ? allocation.examDate.split('-').reverse().join('-') : 'Unknown Date';
            
            wsData.push([{ v: 'Allotted Numbers', s: { font: { bold: true, underline: true }, alignment: centerStyle.alignment } }]);
            
            let roomDateRow = createBlankRow(totalCols).map(c => ({ ...c, s: borderStyle }));
            let roomDisplay = room.roomName || 'Room';
            roomDateRow[0] = { v: `Room No: ${roomDisplay}`, s: boldBorderStyle };
            roomDateRow[totalCols - 1] = { v: `${dateStr} ${session}`, s: boldBorderStyle };
            wsData.push(roomDateRow);

            // Added Status Row for Phase 3
            let statusRow = createBlankRow(totalCols).map(c => ({ ...c, s: borderStyle }));
            statusRow[0] = { v: `Status: ${(allocation.status || 'Pending').toUpperCase()}`, s: { ...boldBorderStyle, font: { ...boldBorderStyle.font, color: { rgb: allocation.status === 'approved' ? "10B981" : "EF4444" } } } };
            statusRow[totalCols - 1] = { v: `ID: ${allocation.id || '-'}`, s: borderStyle };
            wsData.push(statusRow);
            
            // 2. Data Grid
            let linearSeats = [];
            if (room.grid2D) {
                 for (let r = 0; r < room.rows; r++) {
                      for (let c = 0; c < room.cols; c++) {
                           if (room.grid2D[r][c]) linearSeats.push(room.grid2D[r][c]);
                      }
                 }
            }
            
            wsData.push([]); // Gap for header
            const startRowIndex = wsData.length;
            
            for(let r = 0; r < (room.rows || 0); r++) {
                let rowArray = createBlankRow(totalCols).map(c => ({ v: '-------', s: borderStyle }));
                rowArray[0] = { v: r + 1, s: borderStyle };
                wsData.push(rowArray);
            }

            let seatIndex = 0;
            for(let c = 1; c < totalCols; c++) {
                 for(let r = 0; r < (room.rows || 0); r++) {
                      if (seatIndex < linearSeats.length) {
                           wsData[startRowIndex + r][c] = { v: linearSeats[seatIndex].roll, s: borderStyle };
                           seatIndex++;
                      }
                 }
            }

            let headerRow = createBlankRow(totalCols).map(c => ({ ...c, s: boldBorderStyle }));
            headerRow[0] = { v: 'S.NO', s: boldBorderStyle };
            for(let c = 1; c < totalCols; c++) {
                headerRow[c] = { v: `ROW-${Math.ceil(c / 2)}`, s: boldBorderStyle };
            }
            wsData[startRowIndex - 1] = headerRow;

            // 3. Absent Section
            wsData.push([]);
            let absentHeader = createBlankRow(totalCols).map(c => ({ ...c, s: boldBorderStyle }));
            absentHeader[0] = { v: 'Branch', s: boldBorderStyle };
            absentHeader[1] = { v: 'Absent Hall Ticket Numbers', s: boldBorderStyle };
            wsData.push(absentHeader);
            
            const branches = ['Civil', 'Mech.', 'ECE', 'CSE', 'CSE(AI & ML)'];
            branches.forEach(b => {
                let brRow = createBlankRow(totalCols).map(c => ({ ...c, s: borderStyle }));
                brRow[0] = { v: b, s: boldBorderStyle };
                wsData.push(brRow);
            });
            
            // 4. Attendance Section
            wsData.push([]);
            wsData.push(createBlankRow(totalCols).map((c, i) => i === 0 ? { v: 'ATTENDANCE STATEMENT', s: { font: { bold: true }, alignment: centerStyle.alignment } } : c));
            
            let attHeader = createBlankRow(totalCols).map(c => ({ ...c, s: boldBorderStyle }));
            attHeader[0] = { v: 'Branch', s: boldBorderStyle };
            attHeader[1] = { v: 'SUBJECT', s: boldBorderStyle };
            attHeader[totalCols - 3] = { v: 'ALLOTED', s: boldBorderStyle };
            attHeader[totalCols - 2] = { v: 'PRESENT', s: boldBorderStyle };
            attHeader[totalCols - 1] = { v: 'ABSENT',  s: boldBorderStyle };
            wsData.push(attHeader);
            
            [...branches, 'TOTAL'].forEach(b => {
                let row = createBlankRow(totalCols).map(c => ({ ...c, s: borderStyle }));
                row[0] = { v: b, s: boldBorderStyle };
                wsData.push(row);
            });

            // 5. Footer
            wsData.push([]);
            wsData.push([]);
            let invigRow = createBlankRow(totalCols);
            invigRow[totalCols - 2] = { v: "Invigilator's Signature", s: { alignment: { horizontal: "center" } } };
            wsData.push(invigRow);
            
            let n1 = createBlankRow(totalCols);
            n1[totalCols - 2] = { v: "Name: 1)", s: rightAlign };
            wsData.push(n1);
            wsData.push(createBlankRow(totalCols).map((c, i) => i === totalCols - 2 ? { v: "2)", s: rightAlign } : c));

            // Merges
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            ws['!merges'] = [
                { s: {r: 0, c: 0}, e: {r: 0, c: totalCols - 1} },
                { s: {r: 1, c: 0}, e: {r: 1, c: totalCols - 1} },
                { s: {r: 2, c: 0}, e: {r: 2, c: totalCols - 1} },
                { s: {r: 3, c: 0}, e: {r: 3, c: totalCols - 1} }
            ];

            const splitCol = Math.floor(totalCols / 2);
            ws['!merges'].push({ s: {r: 4, c: 0}, e: {r: 4, c: splitCol - 1} });
            ws['!merges'].push({ s: {r: 4, c: splitCol}, e: {r: 4, c: totalCols - 1} });
            
            for(let c = 1; c < totalCols; c += 2) {
                if (c + 1 < totalCols) ws['!merges'].push({ s: {r: 5, c: c}, e: {r: 5, c: c + 1} });
            }

            const absentStart = startRowIndex + (room.rows || 0) + 1;
            for(let r = absentStart; r <= absentStart + 5; r++) {
                ws['!merges'].push({ s: {r: r, c: 1}, e: {r: r, c: totalCols - 1} });
            }

            const attTitleRow = absentStart + 7;
            ws['!merges'].push({ s: {r: attTitleRow, c: 0}, e: {r: attTitleRow, c: totalCols - 1} });
            
            const attHeaderRow = attTitleRow + 1;
            const endSubjCol = totalCols - 4;
            for(let r = attHeaderRow; r <= attHeaderRow + 6; r++) {
                if (endSubjCol > 1) ws['!merges'].push({ s: {r: r, c: 1}, e: {r: r, c: endSubjCol} });
            }

            ws['!cols'] = [{ wch: 12 }, ...Array(totalCols-1).fill({ wch: 16 })];
            ws['!pageSetup'] = { orientation: 'landscape', paperSize: 9, fitToWidth: 1, fitToHeight: 1 };
            
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        const fileName = `Seating_${(allocation.examDate || '').replace(/-/g, '_')}_${(allocation.examType || 'Exam').replace(/ /g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    }
};
