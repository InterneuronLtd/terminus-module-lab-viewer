//BEGIN LICENSE BLOCK 
//Interneuron Terminus

//Copyright(C) 2024  Interneuron Limited

//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.

//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

//See the
//GNU General Public License for more details.

//You should have received a copy of the GNU General Public License
//along with this program.If not, see<http://www.gnu.org/licenses/>.
//END LICENSE BLOCK 


import { Component, OnDestroy, Input, ElementRef, ViewChild, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription, Subject } from 'rxjs';

import { ErrorHandlerService } from '../services/error-handler-service.service';
import { ModuleObservablesService } from '../services/module-observables.service';
import { ApirequestService } from '../services/api-request.service';
//import * as AppConfig from  "src/assets/config/lab-viewer.json"
import { IconsService } from 'src/services/icons.service';
import { saveAs } from 'file-saver';
import { CoreOrder } from './models/entities/core-order.model';
import { AppService } from 'src/services/app.service';
import { CoreOrderAudit } from './models/entities/core-order-audit.model';
import { v4 as uuidv4 } from 'uuid';
import { CoreResult } from './models/entities/core-result.model';
import { CoreNote } from './models/entities/core-note.model';
import { ChartConfiguration } from './models/chart/chart-configuration.model';
import { time_ago } from './utilities/time-ago.utility';
import { sortByProperty } from './utilities/sort-by-property.utility';
import { ChartDataSets, ChartOptions } from 'chart.js';
import { Color, Label } from 'ng2-charts';

import { ToastrService, ToastContainerDirective } from 'ngx-toastr';
import { NotificationService } from 'src/services/notification.service';
import { ModalDirective } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {

  private subscriptions: Subscription = new Subscription();
  // local variables
  noOfRecordsToLoad: number;
  totalOrderCount: number;

  isPrinting: boolean = false;

  title = "Nursing Assessment";

  orderCategory = [];

  filter: string = "";

  orderAudits: CoreOrderAudit[] = [];
  maxViewedOrderAudits: CoreOrderAudit[] = [];
  allOrders: CoreOrder[] = [];
  filteredOrders: CoreOrder[] = [];

  orderResultData: CoreResult[] = [];
  filteredOrderResultData: CoreResult[] = [];

  popupHeader: string = "";


  resultNotes: CoreNote[] = [];
  orderNotes: CoreNote[] = [];
  getOrderResultsEndPoint: string = "";
  getResultNotesEndPoint: string = "";
  getOrderNotesEndPoint: string = "";

  selectedOrder: CoreOrder = new CoreOrder();
  selectedReportText: string = "";
  selectedOrderNote: string = "";

  modalPatientBannerData: any = [];

  isDocumentDownloaded: boolean = true;

  sortDirection: number = 1; // 1 = ASC; -1 = DESC

  // Result history

  resultHistory: CoreResult[] = [];
  selectedResult: CoreResult = new CoreResult();

  // Chart
  chartData: ChartConfiguration = new ChartConfiguration();
  isChartReady: boolean = false;

  selectedNoOfResults: string = "25";

  isLoading: boolean = false;

  @ViewChild(ToastContainerDirective) toastContainer: ToastContainerDirective;
  @ViewChild("orderDetailModal") orderDetailModal: ModalDirective;
  @ViewChild("resultHistoryModal") resultHistoryModal: ModalDirective;
  @ViewChild("orderViewsModal") orderViewsModal: ModalDirective;

  // chart properties
  public lineChartData: ChartDataSets[] = [];
  public lineChartLabels: Label[] = [];
  public lineChartOptions: (ChartOptions);
  public lineChartColors: Color[] = [];
  public lineChartLegend: boolean = true;  
  public lineChartType: string = 'line';
  public lineChartPlugins = [];

  //constructor
  constructor(private appService: AppService,
    private apiRequestService: ApirequestService,
    private errorHandlerService: ErrorHandlerService,
    private moduleObservables: ModuleObservablesService,
    public icons: IconsService,
    private datePipe: DatePipe,
    private notificationService: NotificationService) {
    this.subscribeEvents();
  }

  @Input() set datacontract(value: any) {
    this.initAppService(value);
  }

  initAppService(value: any) {
    this.appService.apiServiceReference = value.apiService;
    this.moduleObservables.unload = value.unload;
    this.appService.contexts = value.contexts;
    this.appService.personId = value.personId;

    let decodedToken: any;
    if (!this.appService.loggedInUserName) {
      decodedToken = this.appService.decodeAccessToken(this.appService.apiServiceReference.authService.user.access_token);
      if (decodedToken != null) {
        this.appService.loggedInUserName = decodedToken.name ? (Array.isArray(decodedToken.name) ? decodedToken.name[0] : decodedToken.name) : decodedToken.IPUId;
        this.appService.loggedInUserId = decodedToken.IPUId;
      }
    }

    if (!this.appService.labViewerConfig) {
      this.subscriptions.add(
        this.apiRequestService.getRequest("./assets/config/lab-viewer.json?v1.0").subscribe(
          (response) => {
            this.appService.labViewerConfig = response;
            this.moduleObservables.contextChanged.next();
            //console.log(this.appService.labViewerConfig);
          }
        )
      );
    }
    else {
      this.moduleObservables.contextChanged.next();
    }
  }

  ngOnInit() {
    // this.allOrders = TestData.orders;
    // this.filteredOrders = this.allOrders;
    // this.orderResultData = [];
    // this.orderCategory = TestData.orderCategory;
    // var value: any = {};
    // value.contexts = JSON.parse("[{\"person_id\": \"5bd254ac-5eb9-4a58-9b75-b3312d779fcc\"}]");
    // value.personId = "5bd254ac-5eb9-4a58-9b75-b3312d779fcc"; //George Reed
    // value.apiService = null;
    // this.appService.personId = "5bd254ac-5eb9-4a58-9b75-b3312d779fcc";
    // this.appService.loggedInUserId = "gautam@interneuron.org";
    // this.appService.contexts = value.contexts;
    // this.initAppService(value);

    this.notificationService.setOverlayContainer(this.toastContainer);
  }

  @ViewChild("pdfBodyDiv") divPdfBody: ElementRef;

  // Subscribe to observables
  subscribeEvents() {
    this.subscriptions.add(
      this.moduleObservables.contextChanged.subscribe(
        () => {
          this.noOfRecordsToLoad = this.appService.labViewerConfig.siteSettings.noOfRecordsToDisplay;
          this.getAllOrderCount();
          this.fetchAllOrders();
          this.fetchModalPatientBannerData(this.appService.personId);
        },
        error => this.errorHandlerService.handleError(error)
      ));
  }

  getAllOrderCount() {
    this.subscriptions.add(
      this.apiRequestService.getRequest(this.appService.labViewerConfig.apiServiceEndpoints.patientOrderCountUrl +
        this.appService.personId).subscribe(
          (response: any) => {
            let data = JSON.parse(response);
            if (data.length > 0) {
              this.totalOrderCount = data[0].totalordercount;
            }
          }
        )
    );
  }

  onLoadMore() {
    this.noOfRecordsToLoad = this.noOfRecordsToLoad + this.appService.labViewerConfig.siteSettings.noOfRecordsToDisplay;
    this.fetchAllOrders();
  }

  fetchAllOrders() {
    var payload: any = [
      {
        "filters": [{
          "filterClause": "(person_id = @personId)"
        }]
      },
      {
        "filterparams": [{
          "paramName": "personId",
          "paramValue": this.appService.personId
        }]
      },
      {
        "selectstatement": "SELECT *"
      },
      {
        "ordergroupbystatement": "ORDER BY datetimeoftransaction DESC Limit " + this.noOfRecordsToLoad
      }
    ];

    this.subscriptions.add(
      this.apiRequestService.postRequest(this.appService.labViewerConfig.apiServiceEndpoints.patientOrdersUrl, payload)
        .subscribe(
          async (response: any) => {
            this.isLoading = true;
            this.allOrders = response;
            await this.initMaxViewedOrderAudits();

            //console.log(this.maxViewedOrderAudits);

            if(this.allOrders.length > 0) {              
              this.allOrders.map(order => {
                order.timeago = null;
                if (order.datetimeoftransaction != null) {
                  order.timeago = time_ago(order.datetimeoftransaction);
                }
                let audit = this.maxViewedOrderAudits.filter(oa => oa.order_id == order.order_id);
                if (audit.length > 0) {
                  order.maxlastvieweddatetime = audit[0].lastvieweddatetime;
                }
                else {
                  order.maxlastvieweddatetime = null;
                }
              });

              //console.log(this.allOrders);
              this.filteredOrders = this.allOrders;
              this.orderResultData = [];
              this.getOrderCategories();
            }
            else {
              //console.log("Calling Toaster");
              this.showNoOrdersMessage("No matching records");
            }

            this.isLoading = false;
          }));
  }

  async initMaxViewedOrderAudits() {
    let payload: any = [
      {
        "filters": [{
          "filterClause": "(person_id = @personId and userid = @userId)"
        }]
      },
      {
        "filterparams": [{
          "paramName": "personId",
          "paramValue": this.appService.personId
        },
        {
          "paramName": "userId",
          "paramValue": this.appService.loggedInUserId
        }]
      },
      {
        "selectstatement": "SELECT *"
      },
      {
        "ordergroupbystatement": ""
      }
    ];

    this.maxViewedOrderAudits = await this.apiRequestService.postRequest(this.appService.labViewerConfig.apiServiceEndpoints.maxLastViewedOrderAuditUrl, payload).toPromise();
  }

  fetchModalPatientBannerData(personId) {
    this.subscriptions.add(
      this.apiRequestService.getRequest(this.appService.labViewerConfig.apiServiceEndpoints.personDataForModalBannerUrl + personId)
        .subscribe(
          (response: string) => {
            this.modalPatientBannerData = JSON.parse(response)[0];
          }));
  }

  getOrderCategories() {
    this.subscriptions.add(
      this.apiRequestService.getRequest(this.appService.labViewerConfig.apiServiceEndpoints.orderCategoryUrl)
        .subscribe(
          (response: string) => {
            this.orderCategory = JSON.parse(response);
            this.onSelectAll();
          }));
  }

  getSelectedOptions() {
    return this.orderCategory
      .filter(opt => opt.checked)
      .map(opt => opt.category)
  }

  filterOrders() {
    let selectedOptions = this.getSelectedOptions();

    this.filteredOrders = this.allOrders.filter(function (el) {
      return selectedOptions.indexOf(el.category) != -1;
    });
  }

  onSelectAll() {
    this.orderCategory.forEach((option) => {
      option.dataCount = this.allOrders.filter((fl) => {
        return fl.category == option.category;
      }).length;
      option.checked = option.dataCount > 0;
      option.disabled = option.dataCount == 0;
    });

    //console.log(this.orderCategory);

    this.filterOrders();
  }

  onSelectNone() {
    this.orderCategory.forEach(function (a) {
      a.checked = false;
    });

    this.filterOrders();
  }

  onCheckboxChanged() {
    this.filterOrders();
  }

  async onViewOrder(order: CoreOrder) {
    this.orderDetailModal.show();
    this.isLoading = true;
    await this.logOrderAudit(order);

    this.getOrderResultsEndPoint = this.appService.labViewerConfig.apiServiceEndpoints.patientOrderResultsUrl + order.order_id;
    this.getOrderNotesEndPoint = this.appService.labViewerConfig.apiServiceEndpoints.patientOrderNotesUrl + order.order_id;

    if (this.getOrderResultsEndPoint != "") {
      this.subscriptions.add(
        this.apiRequestService.getRequest(this.getOrderResultsEndPoint)
          .subscribe(
            (response: string) => {
              this.filteredOrderResultData = JSON.parse(response);
              if (order.ordertype == 'Report' &&
                this.filteredOrderResultData.length > 0) {
                this.selectedReportText = this.filteredOrderResultData[0].observationvalue.replace(new RegExp('\r\n', 'g'), '<br />');
              }
              else {                
                this.selectedReportText = "";

                this.filteredOrderResultData.map(result => {
                  if (result.resultnote && result.resultnote.length > 0) {
                    result.resultnote = "<strong>Note: </strong>" + result.resultnote.replace(new RegExp('\r\n', 'g'), '<br />');
                  }
                });
              }
              this.isLoading = false;
            })
      );
    }

    if (this.getOrderNotesEndPoint != "") {
      this.subscriptions.add(
        this.apiRequestService.getRequest(this.getOrderNotesEndPoint)
          .subscribe(
            (response: string) => {
              var respJson = JSON.parse(response);
              respJson.forEach(element => {
                this.selectedOrderNote = element.comment + '\r\n';
              })
              //console.log(respJson[0].comment);
              //this.selectedOrderNote = respJson[0].comment;
              //console.log(this.selectedOrderNote);
              //console.log(this.selectedOrderNote.length);
            }
          )
      );
    }

    this.popupHeader = order.universalservicetext;
    this.selectedOrder = order;
    //console.log(this.selectedOrder);
    //this.selectedOrderDate = formatDate(order.datetimeoftransaction, "dd/MM/yyyy HH:mm:ss", "en-GB");
    //this.selectedOrderType = order.ordertype;    
  }

  async logOrderAudit(order: CoreOrder) {
    let orderAudit = new CoreOrderAudit();
    orderAudit.orderaudit_id = uuidv4();
    orderAudit.order_id = order.order_id;
    orderAudit.userid = this.appService.loggedInUserId;
    orderAudit.username = this.appService.loggedInUserName;
    orderAudit.lastvieweddatetime = new Date().toISOString();

    await this.apiRequestService.postRequest(this.appService.labViewerConfig.apiServiceEndpoints.postOrderAuditUrl, orderAudit).toPromise();
  }

  onCloseModal() {
    this.filteredOrderResultData = [];
    this.resultNotes = [];
    this.popupHeader = "";
    this.getOrderResultsEndPoint = "";
    this.selectedOrderNote = "";

    this.fetchAllOrders();

    this.orderDetailModal.hide();
  }

  onViewAsPDF() {
    this.isPrinting = true;
    this.isDocumentDownloaded = false;
    var mediaType = 'application/pdf';

    setTimeout(() => {
      let pdfDocBody: any = {
        "pdfBodyHTML": this.divPdfBody.nativeElement.innerHTML,
        "pdfCssUrl": this.appService.labViewerConfig.siteSettings.pdfCssUrl,
        "pdfFooterHTML": "<div class=\"page-footer\" style=\"width:100%; text-align:right; font-size:6px; margin-right:10px\">Page <span class=\"pageNumber\"></span> of <span class=\"totalPages\"></span></div>"
      };

      this.subscriptions.add(
        this.apiRequestService.getDocumentByPost(this.appService.labViewerConfig.apiServiceEndpoints.generatePdfDocumentUrl, pdfDocBody)
          .subscribe(
            (response) => {
              var blob = new Blob([response], { type: mediaType });
              saveAs(blob, this.popupHeader + ".pdf");
              this.isDocumentDownloaded = true;
              this.isPrinting = false;
            },
            error => {
              this.isDocumentDownloaded = true;
              this.errorHandlerService.handleError(error);
              this.isPrinting = false;
            }
          )
      );
    }, 1000);
  }

  onTotalViewsClicked(order: CoreOrder) {
    this.orderViewsModal.show();
    this.subscriptions.add(
      this.apiRequestService.getRequest(this.appService.labViewerConfig.apiServiceEndpoints.orderViewsUrl + order.order_id).subscribe(
        (response: string) => {
          this.orderAudits = JSON.parse(response);
          this.orderAudits.sort(sortByProperty("lastvieweddatetime", -1));
          this.selectedOrder = order;
        }
      )
    );
  }

  onResultsToChartChange() {
    //console.log(this.selectedNoOfResults);
    //this.onResultHistoryClicked(this.selectedResult);
    this.initChartData();
  }

  onResultHistoryClicked(result: CoreResult) {  
    this.resultHistoryModal.show();  
    this.isLoading = true;
    this.isChartReady = false;
    this.selectedResult = result;

    let historyPayload: any = [
      {
        "filters": [{
          "filterClause": "(person_id = @personId AND observationidentifiercode = @identifierCode)"
        }]
      },
      {
        "filterparams": [{
          "paramName": "personId",
          "paramValue": this.appService.personId
        },
        {
          "paramName": "identifierCode",
          "paramValue": result.observationidentifiercode
        }]
      },
      {
        "selectstatement": "SELECT *"
      },
      {
        "ordergroupbystatement": "ORDER BY observationdatetime DESC limit " + this.selectedNoOfResults
      }
    ];

    this.subscriptions.add(
      this.apiRequestService.postRequest(this.appService.labViewerConfig.apiServiceEndpoints.resultHistoryUrl, historyPayload)
        .subscribe((response) => {
          this.resultHistory = response;
          this.resultHistory.sort(sortByProperty("observationdatetime", 1));          
          this.initChartData();
          this.isLoading = false;
        })
    );
  }

  initChartData() {
    this.lineChartLabels = [];
    let observationValues: number[] = [];
    let highRefRangeData: number[] = [];
    let lowRefRangeData: number[] = []

    this.chartData.type = "line";

    let resultCount = 1;

    let results = this.resultHistory.slice(0, parseInt(this.selectedNoOfResults));

    results.map((result) => {

      observationValues.push(Math.round(parseFloat(result.observationvalue) * 100) / 100);
      highRefRangeData.push(Math.round(parseFloat(result.referencerangehigh) * 100) / 100);
      lowRefRangeData.push(Math.round(parseFloat(result.referencerangelow) * 100 / 100));      

      this.lineChartLabels.push(this.datePipe.transform(result.observationdatetime, "dd MMM yyyy HH:mm"));      
    });

    let maxValue = Math.max(...observationValues);
    let maxRangeValue = Math.max(...highRefRangeData);
    let minValue = Math.min(...observationValues);
    let minRangeValue = Math.min(...lowRefRangeData);

    this.lineChartData = [];
    this.lineChartData.push({
      data: lowRefRangeData,
      label: "Low reference range",
      borderColor: "#b0d2d9",
      fill: false
    });
    this.lineChartData.push({
      data: observationValues,
      label: this.selectedResult.observationidentifiertext + " value",
      borderColor: "#2b2f30",
      pointStyle: "crossRot",
      pointRadius: 6,
      fill: false
    });
    this.lineChartData.push({
      data: highRefRangeData,
      label: "High Reference Range",
      borderColor: "#e8c3b9",
      fill: false
    });

    this.lineChartOptions = {
      responsive: true
    };

    this.isChartReady = true;
  }

  sortOrder(propertyName) {
    this.filteredOrders.sort(sortByProperty(propertyName, this.sortDirection));

    this.sortDirection = -1 * this.sortDirection; // 1 = ASC, -1 = DESC
  }

  showNoOrdersMessage(message: string) {
    //this.notificationService.raiseWarning(message);
  }

  // Inherited methods
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.moduleObservables.unload.next("app-lab-viewer");
  }
}
