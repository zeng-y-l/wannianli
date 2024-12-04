<script setup lang="ts">
import { DateTime, DateTimeFormatOptions } from 'luxon'
import { 农历 } from './calendar'
import { computed, ref } from "vue"

const 年份 = ref(DateTime.now().year)
const 日历 = computed(() => {
    try {
        return { kind: 'ok', value: 农历(年份.value) } as const
    } catch (e) {
        return { kind: 'err', value: e } as const
    }
})

const 格式: DateTimeFormatOptions = { ...DateTime.DATETIME_MED_WITH_SECONDS, era: 'short' }
const 日期格式: DateTimeFormatOptions = { ...DateTime.DATE_MED, era: 'short' }

</script>

<template>
    年份：<input type="number" step="1" :value="年份"
        @change="e => 年份 = ~~(e.target as HTMLInputElement).value" />（公元前1年为0，公元前2年为-1，以此类推）
    <hr>
    <p v-if="日历.kind == 'err'">计算出错：{{ 日历.value }}</p>
    <div class="table" v-else>
        <table style="text-align: center;">
            <tbody>
                <tr>
                    <td><strong>周一</strong></td>
                    <td><strong>周二</strong></td>
                    <td><strong>周三</strong></td>
                    <td><strong>周四</strong></td>
                    <td><strong>周五</strong></td>
                    <td><strong>周六</strong></td>
                    <td><strong>周日</strong></td>
                </tr>
                <template v-for="月 in 日历.value">
                    <tr>
                        <td colspan="7">
                            <h3>{{ 月.名字 }} {{ 月.大小 }}</h3>
                            <small>
                                {{ 月.朔日.toLocaleString(日期格式) }} 至 {{ 月.下月朔日.minus({ day: 1 }).toLocaleString(日期格式) }}<br>
                                <template v-for="事件 in 月.事件">
                                    {{ 事件[0] }}：{{ 事件[1].toLocaleString(格式) }}<br>
                                </template>
                            </small>
                        </td>
                    </tr>
                    <tr v-for="周 in 月.每周">
                        <td v-for="日 in 周">
                            <template v-if="日">
                                <strong>{{ 日.名字 }}</strong><br>
                                <small>{{ 日.日期.day }} {{ 日.事件.join(' ') }}</small>
                            </template>
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>
</template>

<style scoped></style>
