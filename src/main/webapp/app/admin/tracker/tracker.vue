<template>
  <div>
    <h2 id="tracker-page-heading" v-text="t$('tracker.title')" data-cy="trackerPageHeading"></h2>

    <div class="table-responsive">
      <table class="table table-striped" data-cy="trackerTable">
        <thead>
          <tr>
            <th v-text="t$('tracker.table.userlogin')"></th>
            <th v-text="t$('tracker.table.ipaddress')"></th>
            <th v-text="t$('tracker.table.page')"></th>
            <th v-text="t$('tracker.table.time')"></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="activity of activities" :key="activity.sessionId">
            <td>{{ activity.userLogin }}</td>
            <td>{{ activity.ipAddress }}</td>
            <td>{{ activity.page }}</td>
            <td>{{ formatDate(activity.time) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" src="./tracker.component.ts"></script>
