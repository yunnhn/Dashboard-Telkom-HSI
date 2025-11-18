import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import toast from 'react-hot-toast';
import PrimaryButton from '@/Components/PrimaryButton';

const MySwal = withReactContent(Swal);

// [PERUBAHAN 1] Ganti nama komponen dan hapus prop 'currentSegment'
const TableConfiguratorSOS = ({ tableConfig, setTableConfig, onSave, viewMode }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Inisialisasi state dengan mencari grup pertama yang valid
    const firstGroup = tableConfig.find(g => g.groupTitle) || {};

    const [formState, setFormState] = useState({
        mode: "sub-column",
        groupTitle: firstGroup.groupTitle || "",
        columnTitle: "",
        columnType: "target",
        operation: "sum",
        operands: [],
        initialSubColumnTitle: "Value",
    });
    const [editGroup, setEditGroup] = useState({
        title: firstGroup.groupTitle || "",
        className: firstGroup.groupClass || "",
    });
    const [columnToDelete, setColumnToDelete] = useState("");
    const [columnToEdit, setColumnToEdit] = useState("");
    const [editFormState, setEditFormState] = useState(null);

    // [FIX 1] 'useMemo' sekarang bisa menangani struktur data campuran
    const availableColumns = useMemo(() => {
        const columns = [];
        tableConfig.forEach((item) => {
            // HANYA proses item yang merupakan GRUP
            if (item.groupTitle && item.columns) {
                item.columns.forEach((col) => {
                    const processColumn = (c, parentKey = "", parentTitle = "") => {
                        if (c.subColumns) {
                            c.subColumns.forEach((sc) => processColumn(sc, col.key, col.title));
                        } else if (c.type !== "calculation") {
                            const key = parentKey ? `${parentKey}.${c.key}` : c.key;
                            const label = parentTitle ? `${item.groupTitle} > ${parentTitle} > ${c.title}` : `${item.groupTitle} > ${c.title}`;
                            columns.push({ label, value: key });
                        }
                    };
                    processColumn(col);
                });
            }
        });
        return columns.sort((a, b) => a.label.localeCompare(b.label));
    }, [tableConfig]);

    const allColumnsList = useMemo(() => {
        const columns = [];
        tableConfig.forEach((item) => {
            if (item.configurable === false) return;

            if (item.groupTitle && item.columns) {
                item.columns.forEach((col) => {
                    if (col.subColumns && col.subColumns.length > 0) {
                        col.subColumns.forEach((sc) => columns.push({ label: `${item.groupTitle} > ${col.title} > ${sc.title}`, value: `${item.groupTitle}.${col.key}.${sc.key}` }));
                    } else {
                        columns.push({ label: `${item.groupTitle} > ${col.title}`, value: `${item.groupTitle}.${col.key}` });
                    }
                });
            } else if (item.key) {
                columns.push({ label: item.title, value: item.key });
            }
        });
        return columns;
    }, [tableConfig]);

    // [FIX 2] Fungsi Reset sekarang di-hardcode untuk SOS
    const handleResetConfig = async () => {
        const result = await MySwal.fire({
            title: 'Anda Yakin?',
            text: "Tampilan tabel akan kembali ke pengaturan default.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, reset tampilan!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            const configPageName = viewMode === 'AOMO'
                                     ? 'analysis_sos_aomo'
                                     : 'analysis_sos_sodoro';

            router.post(route("admin.analysisSOS.resetConfig"), {
                page_name: configPageName
            }, {
                preserveScroll: true,
                onSuccess: () => toast.success("Tampilan berhasil direset ke default.")
            });
        }
    };

    const handleDeleteColumn = async () => {
        if (!columnToDelete) {
            toast.error("Silakan pilih kolom yang akan dihapus.");
            return;
        }
        const selectedColumnLabel = allColumnsList.find(c => c.value === columnToDelete)?.label;

        const result = await MySwal.fire({
            title: 'Anda Yakin?',
            text: `Anda akan menghapus kolom "${selectedColumnLabel}".`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, hapus kolom!',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            const [groupTitle, colKey, subColKey] = columnToDelete.split(".");
            let newConfig = JSON.parse(JSON.stringify(tableConfig));
            const targetGroup = newConfig.find(g => g.groupTitle === groupTitle);

            if (targetGroup) {
                if (subColKey) {
                    const targetCol = targetGroup.columns.find(c => c.key === colKey);
                    if (targetCol && targetCol.subColumns) {
                        targetCol.subColumns = targetCol.subColumns.filter(sc => sc.key !== subColKey);
                        if (targetCol.subColumns.length === 0) {
                            targetGroup.columns = targetGroup.columns.filter(c => c.key !== colKey);
                        }
                    }
                } else {
                    targetGroup.columns = targetGroup.columns.filter(c => c.key !== colKey);
                }

                if (targetGroup.columns.length === 0) {
                    newConfig = newConfig.filter(g => g.groupTitle !== groupTitle);
                }

                setTableConfig(newConfig);
                toast.success("Kolom berhasil dihapus.");
                setColumnToDelete(""); // Reset selection
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        if (type === "radio" && name === "mode") {
            setFormState(prev => ({ ...prev, mode: value, columnTitle: "", operands: [], columnType: "calculation" }));
        } else {
            setFormState(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newKey = `_${formState.columnTitle.toLowerCase().replace(/\s+/g, "_")}`;

        if (formState.mode === "group-column") {
            const newGroup = {
                groupTitle: formState.columnTitle,
                columns: [{
                    key: `_${formState.initialSubColumnTitle.toLowerCase().replace(/\s+/g, "_")}`,
                    title: formState.initialSubColumnTitle,
                    type: "numeric",
                    visible: true,
                }],
            };
            setTableConfig(prev => [...prev, newGroup]);
            toast.success(`Grup "${formState.columnTitle}" berhasil ditambahkan.`);
        } else { // Mode "sub-column"
            const newConfig = JSON.parse(JSON.stringify(tableConfig));
            const targetGroup = newConfig.find(g => g.groupTitle === formState.groupTitle);

            if (targetGroup) {
                const newColumn = {
                    key: newKey,
                    title: formState.columnTitle,
                    // [FIX] Hapus logika ternary yang salah. Sekarang tipe kolom akan 'target' atau 'calculation'.
                    type: formState.columnType,
                    visible: true,
                };

                if (formState.columnType === "calculation") {
                    newColumn.calculation = {
                        operation: formState.operation,
                        operands: formState.operands,
                    };
                }

                targetGroup.columns.push(newColumn);
                setTableConfig(newConfig);
                toast.success(`Kolom "${formState.columnTitle}" ditambahkan ke grup "${formState.groupTitle}".`);
            } else {
                toast.error(`Grup target "${formState.groupTitle}" tidak ditemukan.`);
            }
        }
        setFormState(prev => ({ ...prev, columnTitle: "", operands: [], initialSubColumnTitle: "Value" }));
    };

    const handleSelectGroupToEdit = (e) => {
        const title = e.target.value;
        const group = tableConfig.find(g => g.groupTitle === title);
        if (group) {
            setEditGroup({ title: group.groupTitle, className: group.groupClass || "" });
        }
    };

    const adjustTailwindColor = (className, amount) => {
        if (typeof className !== "string") return className;
        const match = className.match(/(bg|text|border)-(\w+)-(\d{2,3})/);
        if (match) {
            const [, prefix, color, brightnessStr] = match;
            const newBrightness = Math.max(50, Math.min(950, parseInt(brightnessStr, 10) + amount));
            return `${prefix}-${color}-${newBrightness}`;
        }
        return className;
    };

    const handleSaveColor = () => {
        const newConfig = tableConfig.map(group => {
            if (group.groupTitle === editGroup.title) {
                return {
                    ...group,
                    groupClass: editGroup.className,
                    columnClass: adjustTailwindColor(editGroup.className, -100),
                    subColumnClass: adjustTailwindColor(editGroup.className, -200),
                };
            }
            return group;
        });
        setTableConfig(newConfig);
        toast.success(`Warna untuk grup "${editGroup.title}" berhasil diubah.`);
    };

    const handleSelectColumnToEdit = (e) => {
        const identifier = e.target.value;
        setColumnToEdit(identifier);
        if (!identifier) {
            setEditFormState(null);
            return;
        }
        const [groupTitle, colKey, subColKey] = identifier.split(".");
        const group = tableConfig.find(g => g.groupTitle === groupTitle);
        const parentCol = group?.columns.find(c => c.key === colKey);
        const target = subColKey ? parentCol?.subColumns.find(sc => sc.key === subColKey) : parentCol;
        if (target) {
            setEditFormState({
                title: target.title,
                type: target.type,
                operation: target.calculation?.operation || "sum",
                operands: target.calculation?.operands || [],
            });
        }
    };

    const handleSaveChanges = (e) => {
        e.preventDefault();
        if (!columnToEdit || !editFormState) {
            toast.error("Tidak ada kolom yang dipilih untuk diedit.");
            return;
        }
        const newConfig = JSON.parse(JSON.stringify(tableConfig));
        const [groupTitle, colKey, subColKey] = columnToEdit.split(".");
        const group = newConfig.find(g => g.groupTitle === groupTitle);
        const parentCol = group?.columns.find(c => c.key === colKey);
        const target = subColKey ? parentCol?.subColumns.find(sc => sc.key === subColKey) : parentCol;

        if (target) {
            target.title = editFormState.title;
            if (target.type === "calculation") {
                target.calculation = {
                    operation: editFormState.operation,
                    operands: editFormState.operands,
                };
            }
            setTableConfig(newConfig);
            toast.success(`Kolom "${target.title}" berhasil diupdate.`);
            setColumnToEdit("");
            setEditFormState(null);
        } else {
            toast.error("Gagal menemukan kolom untuk diupdate.");
        }
    };

    const renderOperandInputs = (form, setForm, availableCols) => {
        const handleOpChange = (index, value) => {
            setForm(prev => {
                const newOperands = [...(prev.operands || [])];
                newOperands[index] = value;
                return { ...prev, operands: newOperands };
            });
        };
        const handleCheckboxOpChange = (checked, value) => {
            setForm(prev => {
                const current = prev.operands || [];
                return checked ? { ...prev, operands: [...current, value] } : { ...prev, operands: current.filter(op => op !== value) };
            });
        };

        switch (form.operation) {
            case "sum":
            case "average":
            case "count":
                return (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kolom</label>
                        <div className="w-full border rounded-md h-32 overflow-y-auto p-2 space-y-1">
                            {availableCols.map(col => (
                                <label key={col.value} className="flex items-center p-1 rounded hover:bg-gray-100">
                                    <input type="checkbox" checked={(form.operands || []).includes(col.value)} onChange={e => handleCheckboxOpChange(e.target.checked, col.value)} className="h-4 w-4 rounded" />
                                    <span className="ml-2 text-sm text-gray-700">{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            case "percentage":
                return (
                    <div className="space-y-2">
                        {['Pembilang (Numerator)', 'Penyebut (Denominator)'].map((label, index) => (
                            <div key={index}>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                                <select value={form.operands[index] || ""} onChange={e => handleOpChange(index, e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">Pilih Kolom</option>
                                    {availableCols.map(col => <option key={col.value} value={col.value}>{col.label}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md mb-6">
            <div className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50" onClick={() => setIsExpanded(!isExpanded)}>
                <h3 className="font-semibold text-gray-700">Konfigurasi Tampilan Tabel</h3>
                <button type="button" className="text-sm font-bold text-blue-600 hover:underline">{isExpanded ? "Tutup" : "Buka"}</button>
            </div>

            {isExpanded && (
                <div className="p-6 border-t">
                    <div className="flex flex-col md:flex-row md:gap-8">
                        {/* Kolom Kiri: Tambah Kolom/Grup */}
                        <div className="flex-grow md:w-2/3">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Pilih Aksi:
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mode"
                                                value="sub-column"
                                                checked={formState.mode === "sub-column"}
                                                onChange={handleInputChange}
                                                className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                            />
                                            Tambah Sub-Kolom
                                        </label>
                                        <label className="flex items-center">
                                            <input
                                                type="radio"
                                                name="mode"
                                                value="group-column"
                                                checked={formState.mode === "group-column"}
                                                onChange={handleInputChange}
                                                className="mr-2 h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                            />
                                            Tambah Grup Utama
                                        </label>
                                    </div>
                                </div>

                                {formState.mode === "group-column" && (
                                    <div className="p-4 border rounded-md space-y-4 bg-gray-50">
                                        <h4 className="font-semibold text-md text-gray-800">Detail Grup Utama Baru</h4>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nama Grup Utama Baru</label>
                                            <input
                                                type="text"
                                                name="columnTitle"
                                                value={formState.columnTitle}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nama Sub-Kolom Awal</label>
                                            <input
                                                type="text"
                                                name="initialSubColumnTitle"
                                                value={formState.initialSubColumnTitle}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                {formState.mode === "sub-column" && (
                                    <div className="p-4 border rounded-md space-y-4 bg-gray-50">
                                        <h4 className="font-semibold text-md text-gray-800">Detail Sub-Kolom Baru</h4>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Tambahkan ke Grup Induk</label>
                                            <select
                                                name="groupTitle"
                                                value={formState.groupTitle}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                            >
                                                {tableConfig.filter(g => g.groupTitle).map((g) => (
                                                    <option key={g.groupTitle} value={g.groupTitle}>{g.groupTitle}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nama Sub-Kolom Baru</label>
                                            <input
                                                type="text"
                                                name="columnTitle"
                                                value={formState.columnTitle}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe Kolom:</label>
                                            <div className="flex gap-4">
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="columnType"
                                                        value="target"
                                                        checked={formState.columnType === "target"}
                                                        onChange={handleInputChange}
                                                        className="mr-2"
                                                    />
                                                    Target Manual
                                                </label>
                                                <label className="flex items-center">
                                                    <input
                                                        type="radio"
                                                        name="columnType"
                                                        value="calculation"
                                                        checked={formState.columnType === "calculation"}
                                                        onChange={handleInputChange}
                                                        className="mr-2"
                                                    />
                                                    Kalkulasi
                                                </label>
                                            </div>
                                        </div>

                                        {formState.columnType === "calculation" && (
                                            <div className="pt-4 border-t space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Operasi Kalkulasi</label>
                                                    <select
                                                        name="operation"
                                                        value={formState.operation}
                                                        onChange={handleInputChange}
                                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                                    >
                                                        <option value="sum">SUM (Jumlahkan)</option>
                                                        <option value="percentage">PERCENTAGE (Persentase)</option>
                                                        <option value="average">AVERAGE (Rata-rata)</option>
                                                        <option value="count">COUNT (Hitung Jumlah)</option>
                                                    </select>
                                                </div>
                                                {renderOperandInputs(formState, setFormState, availableColumns)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="text-right pt-4">
                                    <PrimaryButton type="submit">
                                        {formState.mode === "sub-column" ? "Tambah Sub-Kolom" : "Tambah Grup Kolom"}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>

                        {/* Kolom Kanan: Opsi Lain */}
                        <div className="md:w-1/3 pt-6 mt-6 md:pt-0 md:mt-0 md:border-l md:pl-8 space-y-8">
                            {/* Opsi Global */}
                            <div>
                                <div className="flex justify-between items-center border-b pb-2 mb-4">
                                    <h4 className="font-semibold text-md text-gray-800">Opsi Tampilan</h4>
                                    <div>
                                        <button type="button" onClick={onSave} className="text-xs text-blue-600 hover:underline font-semibold mr-4">Simpan</button>
                                        <button type="button" onClick={handleResetConfig} className="text-xs text-red-600 hover:underline font-semibold">Reset</button>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h5 className="font-semibold text-sm text-gray-700">Ubah Warna Grup</h5>
                                    <select value={editGroup.title} onChange={handleSelectGroupToEdit} className="mt-1 block w-full ...">
                                        {tableConfig
                                            .filter(g => g.groupTitle) // <-- FIX: Hanya proses item yang memiliki groupTitle
                                            .map(g => <option key={g.groupTitle} value={g.groupTitle}>{g.groupTitle}</option>)
                                        }
                                    </select>
                                    <input type="text" value={editGroup.className} onChange={e => setEditGroup({ ...editGroup, className: e.target.value })} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" placeholder="Contoh: bg-red-600" />
                                    <PrimaryButton type="button" onClick={handleSaveColor} className="w-full justify-center">Terapkan Warna</PrimaryButton>
                                </div>
                            </div>

                            {/* Edit & Hapus Kolom */}
                            <div className="space-y-4 pt-4 border-t">
                                <h5 className="font-semibold text-sm text-gray-700">Edit Kolom</h5>
                                <select value={columnToEdit} onChange={handleSelectColumnToEdit} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">-- Pilih Kolom --</option>
                                    {allColumnsList.map(col => <option key={col.value} value={col.value}>{col.label}</option>)}
                                </select>
                                {editFormState && (
                                    <form onSubmit={handleSaveChanges} className="p-4 border rounded bg-gray-50 space-y-4">
                                        <input type="text" value={editFormState.title} onChange={e => setEditFormState(p => ({ ...p, title: e.target.value }))} className="block w-full" required />
                                        {editFormState.type === 'calculation' && (
                                            <>
                                                <select value={editFormState.operation} onChange={e => setEditFormState(p => ({ ...p, operation: e.target.value, operands: [] }))} className="block w-full">
                                                    <option value="sum">SUM</option>
                                                    <option value="percentage">PERCENTAGE</option>
                                                    <option value="average">AVERAGE</option>
                                                    <option value="count">COUNT</option>
                                                </select>
                                                {renderOperandInputs(editFormState, setEditFormState, availableColumns)}
                                            </>
                                        )}
                                        <PrimaryButton type="submit" className="w-full justify-center">Simpan Perubahan</PrimaryButton>
                                    </form>
                                )}
                                <h5 className="font-semibold text-sm text-gray-700 pt-4 border-t">Hapus Kolom</h5>
                                <select value={columnToDelete} onChange={e => setColumnToDelete(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    {allColumnsList.length > 0 ? allColumnsList.map(col => <option key={col.value} value={col.value}>{col.label}</option>) : <option>Tidak ada kolom</option>}
                                </select>
                                <button type="button" onClick={handleDeleteColumn} className="w-full justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Hapus Kolom Terpilih</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TableConfiguratorSOS;
