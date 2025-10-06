@php
    // ===================================================================
    // HELPER FUNCTIONS & CONFIGS
    // ===================================================================
    function tailwindToHex($class)
    {
        $colors = [
            'bg-blue-600' => '#2563EB',
            'bg-orange-600' => '#EA580C',
            'bg-green-700' => '#15803D',
            'bg-gray-600' => '#4B5563',
            'bg-purple-600' => '#9333EA',
            'bg-blue-400' => '#60A5FA',
            'bg-orange-400' => '#FB923C',
            'bg-green-500' => '#22C55E',
            'bg-gray-500' => '#6B7280',
            'bg-purple-500' => '#A855F7',
            'bg-orange-300' => '#FDBA74',
            'bg-green-300' => '#86EFAC',
        ];
        return $colors[$class] ?? '#808080';
    }

    function getGroupColspan($group)
    {
        $span = 0;
        foreach ($group['columns'] as $col) {
            $span += count($col['subColumns'] ?? [1]);
        }
        return $span > 0 ? $span : 1;
    }

    function getCellValue($item, $col, $parentCol = null)
    {
        if (isset($col['type']) && $col['type'] === 'calculation') {
            if (empty($col['calculation']['operands'])) {
                return 0;
            }
            $operands = $col['calculation']['operands'];
            $values = array_map(fn($opKey) => (float) ($item[$opKey] ?? 0), $operands);
            switch ($col['calculation']['operation']) {
                case 'percentage':
                    $num = $values[0] ?? 0;
                    $den = $values[1] ?? 0;
                    return $den != 0 ? round(($num / $den) * 100, 1) . '%' : '0.0%';
                case 'sum':
                    return array_sum($values);
                default:
                    return 0;
            }
        }
        $fullKey = $parentCol ? $parentCol['key'] . $col['key'] : $col['key'];
        $value = $item[$fullKey] ?? 0;
        if (strpos($fullKey, 'revenue_') === 0 && is_numeric($value)) {
            return number_format((float) $value, 4);
        }
        return is_numeric($value) ? $value : ($value ?: 0);
    }

    $legsTableConfig = [
        [
            'groupTitle' => 'In Progress',
            'groupClass' => 'bg-blue-600',
            'columnClass' => 'bg-blue-400',
            'columns' => [
                ['key' => 'in_progress_n', 'title' => 'N'],
                ['key' => 'in_progress_o', 'title' => 'O'],
                ['key' => 'in_progress_ae', 'title' => 'AE'],
                ['key' => 'in_progress_ps', 'title' => 'PS'],
            ],
        ],
        [
            'groupTitle' => 'Prov Comp',
            'groupClass' => 'bg-orange-600',
            'columnClass' => 'bg-orange-400',
            'columns' => [
                ['key' => 'prov_comp_n_realisasi', 'title' => 'N'],
                ['key' => 'prov_comp_o_realisasi', 'title' => 'O'],
                ['key' => 'prov_comp_ae_realisasi', 'title' => 'AE'],
                ['key' => 'prov_comp_ps_realisasi', 'title' => 'PS'],
            ],
        ],
        [
            'groupTitle' => 'REVENUE (Rp Juta)',
            'groupClass' => 'bg-green-700',
            'columnClass' => 'bg-green-500',
            'subColumnClass' => 'bg-green-300',
            'columns' => [
                [
                    'key' => 'revenue_n',
                    'title' => 'N',
                    'subColumns' => [['key' => '_ach', 'title' => 'ACH'], ['key' => '_target', 'title' => 'T']],
                ],
                [
                    'key' => 'revenue_o',
                    'title' => 'O',
                    'subColumns' => [['key' => '_ach', 'title' => 'ACH'], ['key' => '_target', 'title' => 'T']],
                ],
                [
                    'key' => 'revenue_ae',
                    'title' => 'AE',
                    'subColumns' => [['key' => '_ach', 'title' => 'ACH'], ['key' => '_target', 'title' => 'T']],
                ],
                [
                    'key' => 'revenue_ps',
                    'title' => 'PS',
                    'subColumns' => [['key' => '_ach', 'title' => 'ACH'], ['key' => '_target', 'title' => 'T']],
                ],
            ],
        ],
        [
            'groupTitle' => 'Grand Total',
            'groupClass' => 'bg-purple-600',
            'columnClass' => 'bg-purple-500',
            'columns' => [
                [
                    'key' => 'grand_total_realisasi_legs',
                    'title' => 'Total',
                    'type' => 'calculation',
                    'calculation' => [
                        'operation' => 'sum',
                        'operands' => [
                            'prov_comp_n_realisasi',
                            'prov_comp_o_realisasi',
                            'prov_comp_ae_realisasi',
                            'prov_comp_ps_realisasi',
                        ],
                    ],
                ],
            ],
        ],
    ];
@endphp

{{-- =================================================================== --}}
{{-- STRUKTUR UTAMA EXCEL --}}
{{-- =================================================================== --}}

{{-- ########## AWAL TABEL LEGS ########## --}}
@php
    $grandTotalsLegs = [];
    foreach ($reportDataLegs as $item) {
        foreach ($item as $key => $value) {
            if (is_numeric($value)) {
                $grandTotalsLegs[$key] = ($grandTotalsLegs[$key] ?? 0) + $value;
            }
        }
    }
@endphp
<table style="border-collapse: collapse;">
    <tr>
        <td colspan="5" style="font-size: 14px; font-weight: bold;">Progress WFM Digital Product MTD
            {{ $period }} Segmen LEGS</td>
    </tr>
    <tr></tr>
    <tr>
        <td style="font-weight: bold;">Total</td>
        <td>{{ $detailsLegs['total'] ?? 0 }}</td>
    </tr>
    <tr>
        <td style="font-weight: bold;">OGP</td>
        <td>{{ $detailsLegs['ogp'] ?? 0 }}</td>
    </tr>
    <tr>
        <td style="font-weight: bold;">Closed</td>
        <td>{{ $detailsLegs['closed'] ?? 0 }}</td>
    </tr>
    <tr></tr>
</table>
<table style="border-collapse: collapse;">
    <thead>
        <tr>
            <th rowspan="3"
                style="vertical-align: middle; text-align: center; font-weight: bold; border: 1px solid #000; background-color: #333; color: #FFFFFF;">
                WILAYAH TELKOM</th>
            @foreach ($legsTableConfig as $group)
                <th colspan="{{ getGroupColspan($group) }}"
                    style="text-align: center; font-weight: bold; border: 1px solid #000; background-color: {{ tailwindToHex($group['groupClass']) }}; color: #FFFFFF;">
                    {{ $group['groupTitle'] }}</th>
            @endforeach
        </tr>
        <tr>
            @foreach ($legsTableConfig as $group)
                @foreach ($group['columns'] as $col)
                    <th colspan="{{ count($col['subColumns'] ?? [1]) }}"
                        rowspan="{{ isset($col['subColumns']) ? 1 : 2 }}"
                        style="vertical-align: middle; text-align: center; font-weight: bold; border: 1px solid #000; background-color: {{ tailwindToHex($group['columnClass'] ?? '') }}; color: #FFFFFF;">
                        {{ $col['title'] }}</th>
                @endforeach
            @endforeach
        </tr>
        <tr>
            @foreach ($legsTableConfig as $group)
                @foreach ($group['columns'] as $col)
                    @if (isset($col['subColumns']))
                        @foreach ($col['subColumns'] as $subCol)
                            <th
                                style="text-align: center; font-weight: bold; border: 1px solid #000; background-color: {{ tailwindToHex($group['subColumnClass'] ?? '') }}; color: #000000;">
                                {{ $subCol['title'] }}</th>
                        @endforeach
                    @endif
                @endforeach
            @endforeach
        </tr>
    </thead>
    <tbody>
        @foreach ($reportDataLegs as $item)
            <tr>
                <td style="border: 1px solid #000; font-weight: bold;">{{ $item['nama_witel'] }}</td>
                @foreach ($legsTableConfig as $group)
                    @foreach ($group['columns'] as $col)
                        @if (isset($col['subColumns']))
                            @foreach ($col['subColumns'] as $subCol)
                                <td style="border: 1px solid #000; text-align: right;">
                                    {{ getCellValue($item, $subCol, $col) }}</td>
                            @endforeach
                        @else
                            <td style="border: 1px solid #000; text-align: right;">{{ getCellValue($item, $col) }}</td>
                        @endif
                    @endforeach
                @endforeach
            </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr style="font-weight: bold;">
            <td style="border: 1px solid #000; background-color: #333; color: #FFFFFF;">GRAND TOTAL</td>
            @foreach ($legsTableConfig as $group)
                @foreach ($group['columns'] as $col)
                    @if (isset($col['subColumns']))
                        @foreach ($col['subColumns'] as $subCol)
                            <td
                                style="border: 1px solid #000; text-align: right; background-color: {{ tailwindToHex($group['groupClass']) }}; color: #FFFFFF;">
                                {{ getCellValue($grandTotalsLegs, $subCol, $col) }}</td>
                        @endforeach
                    @else
                        <td
                            style="border: 1px solid #000; text-align: right; background-color: {{ tailwindToHex($group['groupClass']) }}; color: #FFFFFF;">
                            {{ getCellValue($grandTotalsLegs, $col) }}</td>
                    @endif
                @endforeach
            @endforeach
        </tr>
    </tfoot>
</table>
{{-- ########## AKHIR TABEL LEGS ########## --}}

<td style="vertical-align: top; padding-left: 20px;">
    {{-- Tabel Keterangan --}}
    <table style="border-collapse: collapse;">
        <thead>
            <tr>
                <th colspan="2" style="font-weight: bold; border: 1px solid #000; text-align: center;">
                    KETERANGAN</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="font-weight: bold; border: 1px solid #000; text-align: center;">N</td>
                <td style="border: 1px solid #000;">Netmonk</td>
            </tr>
            <tr>
                <td style="font-weight: bold; border: 1px solid #000; text-align: center;">O</td>
                <td style="border: 1px solid #000;">OCA</td>
            </tr>
            <tr>
                <td style="font-weight: bold; border: 1px solid #000; text-align: center;">AE</td>
                <td style="border: 1px solid #000;">Antares Eazy</td>
            </tr>
            <tr>
                <td style="font-weight: bold; border: 1px solid #000; text-align: center;">PS</td>
                <td style="border: 1px solid #000;">Pijar Sekolah</td>
            </tr>
            <tr>
                <td style="font-weight: bold; border: 1px solid #000; text-align: center;">T</td>
                <td style="border: 1px solid #000;">Target</td>
            </tr>
            <tr>
                <td style="font-weight: bold; border: 1px solid #000; text-align: center;">R</td>
                <td style="border: 1px solid #000;">Realisasi</td>
            </tr>
            <tr>
                <td style="font-weight: bold; border: 1px solid #000; text-align: center;">P</td>
                <td style="border: 1px solid #000;">Persentase</td>
            </tr>
        </tbody>
    </table>
</td>

<br><br> {{-- Memberi jarak antar tabel --}}

{{-- ########## AWAL TABEL SME ########## --}}
@php
    $grandTotalsSme = [];
    foreach ($reportDataSme as $item) {
        foreach ($item as $key => $value) {
            if (is_numeric($value)) {
                $grandTotalsSme[$key] = ($grandTotalsSme[$key] ?? 0) + $value;
            }
        }
    }
@endphp
<table style="border-collapse: collapse;">
    <tr>
        <td colspan="5" style="font-size: 14px; font-weight: bold;">Progress WFM Digital Product MTD
            {{ $period }} Segmen SME</td>
    </tr>
    <tr></tr>
    <tr>
        <td style="font-weight: bold;">Total</td>
        <td>{{ $detailsSme['total'] ?? 0 }}</td>
    </tr>
    <tr>
        <td style="font-weight: bold;">OGP</td>
        <td>{{ $detailsSme['ogp'] ?? 0 }}</td>
    </tr>
    <tr>
        <td style="font-weight: bold;">Closed</td>
        <td>{{ $detailsSme['closed'] ?? 0 }}</td>
    </tr>
    <tr></tr>
</table>
<table style="border-collapse: collapse;">
    <thead>
        <tr>
            <th rowspan="3"
                style="vertical-align: middle; text-align: center; font-weight: bold; border: 1px solid #000; background-color: #333; color: #FFFFFF;">
                WILAYAH TELKOM</th>
            @foreach ($tableConfig as $group)
                <th colspan="{{ getGroupColspan($group) }}"
                    style="text-align: center; font-weight: bold; border: 1px solid #000; background-color: {{ tailwindToHex($group['groupClass']) }}; color: #FFFFFF;">
                    {{ $group['groupTitle'] }}</th>
            @endforeach
        </tr>
        <tr>
            @foreach ($tableConfig as $group)
                @foreach ($group['columns'] as $col)
                    <th colspan="{{ count($col['subColumns'] ?? [1]) }}"
                        rowspan="{{ isset($col['subColumns']) ? 1 : 2 }}"
                        style="vertical-align: middle; text-align: center; font-weight: bold; border: 1px solid #000; background-color: {{ tailwindToHex($group['columnClass'] ?? '') }}; color: #FFFFFF;">
                        {{ $col['title'] }}</th>
                @endforeach
            @endforeach
        </tr>
        <tr>
            @foreach ($tableConfig as $group)
                @foreach ($group['columns'] as $col)
                    @if (isset($col['subColumns']))
                        @foreach ($col['subColumns'] as $subCol)
                            <th
                                style="text-align: center; font-weight: bold; border: 1px solid #000; background-color: {{ tailwindToHex($group['subColumnClass'] ?? '') }}; color: #000000;">
                                {{ $subCol['title'] }}</th>
                        @endforeach
                    @endif
                @endforeach
            @endforeach
        </tr>
    </thead>
    <tbody>
        @foreach ($reportDataSme as $item)
            <tr>
                <td style="border: 1px solid #000; font-weight: bold;">{{ $item['nama_witel'] }}</td>
                @foreach ($tableConfig as $group)
                    @foreach ($group['columns'] as $col)
                        @if (isset($col['subColumns']))
                            @foreach ($col['subColumns'] as $subCol)
                                <td style="border: 1px solid #000; text-align: right;">
                                    {{ getCellValue($item, $subCol, $col) }}</td>
                            @endforeach
                        @else
                            <td style="border: 1px solid #000; text-align: right;">{{ getCellValue($item, $col) }}</td>
                        @endif
                    @endforeach
                @endforeach
            </tr>
        @endforeach
    </tbody>
    <tfoot>
        <tr style="font-weight: bold;">
            <td style="border: 1px solid #000; background-color: #333; color: #FFFFFF;">GRAND TOTAL</td>
            @foreach ($tableConfig as $group)
                @foreach ($group['columns'] as $col)
                    @if (isset($col['subColumns']))
                        @foreach ($col['subColumns'] as $subCol)
                            <td
                                style="border: 1px solid #000; text-align: right; background-color: {{ tailwindToHex($group['groupClass']) }}; color: #FFFFFF;">
                                {{ getCellValue($grandTotalsSme, $subCol, $col) }}</td>
                        @endforeach
                    @else
                        <td
                            style="border: 1px solid #000; text-align: right; background-color: {{ tailwindToHex($group['groupClass']) }}; color: #FFFFFF;">
                            {{ getCellValue($grandTotalsSme, $col) }}</td>
                    @endif
                @endforeach
            @endforeach
        </tr>
    </tfoot>
</table>
{{-- ########## AKHIR TABEL SME ########## --}}
